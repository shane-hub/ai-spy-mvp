import { timingSafeEqual } from "crypto";
import { Router, Response } from "express";
import multer from "multer";
import prisma from "../utils/prisma";
import redis from "../utils/redis";
import {
  optionalAuthenticateToken,
  AuthRequest,
} from "../middlewares/auth";
import { analyzeImage } from "../services/detection";

const router = Router();
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function matchesClientSecret(candidate: unknown) {
  const expected = process.env.APP_CLIENT_SECRET;
  if (!expected || typeof candidate !== "string") return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

router.post(
  "/detect",
  optionalAuthenticateToken,
  upload.single("image"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    let creditConsumed = false;
    try {
      if (!req.file) {
        res.status(400).json({ code: 400, msg: "No image provided" });
        return;
      }
      if (!ACCEPTED_TYPES.has(req.file.mimetype)) {
        res.status(415).json({ code: 415, msg: "Unsupported image type" });
        return;
      }

      const userId = req.user?.userId;
      const isTrustedProxy = matchesClientSecret(req.body?.auth_token);

      if (!isTrustedProxy && req.isGuest) {
        const deviceId = req.deviceId;
        const guestLimitKey = `rate_limit:detect:device:${deviceId}`;
        const usages = await redis.incr(guestLimitKey);
        if (usages > 1) {
          res
            .status(402)
            .json({
              code: 402,
              msg: "Guest free trial exceeded. Please login.",
            });
          return;
        }
        await redis.expire(guestLimitKey, 365 * 24 * 60 * 60);
      } else if (!isTrustedProxy && userId) {
        try {
          await prisma.$transaction(async (tx: any) => {
            const result = await tx.$executeRaw`
              UPDATE users
              SET available_credits = available_credits - 1
              WHERE id = ${userId}::uuid AND available_credits >= 1;
            `;
            if (result === 0) throw new Error("INSUFFICIENT_CREDITS");
            await tx.creditsLedger.create({
              data: {
                userId,
                transactionType: "DETECT_CONSUME",
                amount: -1,
              },
            });
          });
          creditConsumed = true;
        } catch (transactionError: unknown) {
          if (
            transactionError instanceof Error &&
            transactionError.message === "INSUFFICIENT_CREDITS"
          ) {
            res
              .status(402)
              .json({
                code: 402,
                msg: "Insufficient credits. Please recharge.",
              });
            return;
          }
          throw transactionError;
        }
      }

      try {
        const result = await analyzeImage({
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
        });

        if (userId && !isTrustedProxy) {
          await prisma.scanHistory.create({
            data: {
              userId,
              imageUrl: "",
              isFake: result.is_fake,
              confidenceScore: result.confidence_score,
            },
          });
        }

        res.status(200).json({
          code: 200,
          msg: "success",
          data: result,
        });
      } catch (providerError) {
        if (userId && creditConsumed) {
          await prisma.$transaction(async (tx: any) => {
            await tx.user.update({
              where: { id: userId },
              data: { availableCredits: { increment: 1 } },
            });
            await tx.creditsLedger.create({
              data: {
                userId,
                transactionType: "DETECT_REFUND",
                amount: 1,
              },
            });
          });
        }
        throw providerError;
      }
    } catch (error: unknown) {
      const upstreamData =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response
          ? error.response.data
          : undefined;
      console.error(
        "Detection error:",
        upstreamData ?? (error instanceof Error ? error.message : error),
      );
      res.status(500).json({ code: 500, msg: "Detection failed" });
    }
  },
);

export default router;
