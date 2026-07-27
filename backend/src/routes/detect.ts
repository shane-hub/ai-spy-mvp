import { createHmac, timingSafeEqual } from "crypto";
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
const GUEST_LIMIT_TTL_SECONDS = 365 * 24 * 60 * 60;
const DIRECT_RESULT_TTL_SECONDS = 10 * 60;
const MAX_TICKET_LIFETIME_MS = 5 * 60 * 1000;
const guestMemoryLimits = new Map<
  string,
  { count: number; expiresAt: number }
>();
const usedDirectTickets = new Map<string, number>();

type UploadTicketPayload = {
  scan_id: string;
  exp: number;
};

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

function parseUploadTicket(candidate: unknown): UploadTicketPayload | null {
  const secret = process.env.APP_CLIENT_SECRET;
  if (!secret || typeof candidate !== "string") return null;
  const [encodedPayload, candidateSignature, extra] = candidate.split(".");
  if (!encodedPayload || !candidateSignature || extra) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  const candidateBuffer = Buffer.from(candidateSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    candidateBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(candidateBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<UploadTicketPayload>;
    const now = Date.now();
    if (
      typeof payload.scan_id !== "string" ||
      !/^scan_[a-f0-9]{20}$/.test(payload.scan_id) ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      payload.exp > now + MAX_TICKET_LIFETIME_MS
    ) {
      return null;
    }
    return payload as UploadTicketPayload;
  } catch {
    return null;
  }
}

function consumeDirectTicket(ticket: UploadTicketPayload) {
  const now = Date.now();
  for (const [scanId, expiresAt] of usedDirectTickets) {
    if (expiresAt <= now) usedDirectTickets.delete(scanId);
  }
  if (usedDirectTickets.has(ticket.scan_id)) return false;
  usedDirectTickets.set(ticket.scan_id, ticket.exp);
  return true;
}

async function storeDirectResult(scanId: string, value: unknown) {
  await redis.set(
    `direct_result:${scanId}`,
    JSON.stringify(value),
    "EX",
    DIRECT_RESULT_TTL_SECONDS,
  );
}

async function consumeGuestTrial(deviceId: string) {
  const key = `rate_limit:detect:device:${deviceId}`;
  const usages = await redis.incr(key);
  if (usages === 1) await redis.expire(key, GUEST_LIMIT_TTL_SECONDS);
  return usages;
}

router.get(
  "/detect/result/:scanId",
  async (req, res: Response): Promise<void> => {
    if (!matchesClientSecret(req.headers["x-app-client-secret"])) {
      res.status(401).json({ code: 401, msg: "Unauthorized" });
      return;
    }
    const { scanId } = req.params;
    if (!/^scan_[a-f0-9]{20}$/.test(scanId)) {
      res.status(400).json({ code: 400, msg: "Invalid scan ID" });
      return;
    }
    const stored = await redis.get(`direct_result:${scanId}`);
    if (!stored) {
      res.status(404).json({ code: 404, status: "pending" });
      return;
    }
    try {
      res.status(200).json(JSON.parse(stored));
    } catch {
      res.status(500).json({ code: 500, status: "failed" });
    }
  },
);

router.post(
  "/detect",
  optionalAuthenticateToken,
  upload.single("image"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    let creditConsumed = false;
    let directScanId = "";
    try {
      if (!req.file) {
        res.status(400).json({ code: 400, msg: "No image provided" });
        return;
      }
      if (!ACCEPTED_TYPES.has(req.file.mimetype)) {
        res.status(415).json({ code: 415, msg: "Unsupported image type" });
        return;
      }

      const directTicketCandidate = req.body?.upload_ticket;
      const directTicket = directTicketCandidate
        ? parseUploadTicket(directTicketCandidate)
        : null;
      if (directTicketCandidate && !directTicket) {
        res.status(401).json({ code: 401, msg: "Invalid upload ticket" });
        return;
      }
      if (directTicket) {
        if (!consumeDirectTicket(directTicket)) {
          res.status(409).json({ code: 409, msg: "Upload ticket already used" });
          return;
        }
        directScanId = directTicket.scan_id;
        await storeDirectResult(directScanId, {
          code: 202,
          status: "processing",
        });
      }

      const userId = req.user?.userId;
      const isTrustedProxy = matchesClientSecret(req.body?.auth_token);

      if (!directScanId && !isTrustedProxy && req.isGuest) {
        const deviceId = req.deviceId || req.ip;
        if (!deviceId) {
          res.status(400).json({ code: 400, msg: "Missing device identity" });
          return;
        }
        const usages = await consumeGuestTrial(deviceId);
        if (usages > 1) {
          res.status(402).json({
            code: 402,
            msg: "Guest free trial exceeded. Please login.",
          });
          return;
        }
      } else if (!directScanId && !isTrustedProxy && userId) {
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
            res.status(402).json({
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

        if (directScanId) {
          await storeDirectResult(directScanId, {
            code: 200,
            status: "success",
            data: result,
          });
          res.status(202).json({
            code: 202,
            msg: "processed",
            scan_id: directScanId,
          });
          return;
        }

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
      if (directScanId) {
        await storeDirectResult(directScanId, {
          code: 502,
          status: "failed",
          error_code: "DETECTION_FAILED",
        }).catch(() => undefined);
      }
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
