import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import prisma from '../utils/prisma';
import redis from '../utils/redis';
import { optionalAuthenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/detect', optionalAuthenticateToken, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ code: 400, msg: 'No image provided' });
            return;
        }

        let userId = req.user?.userId;
        let isGuest = req.isGuest;
        let deviceId = req.deviceId;

        if (isGuest) {
            // Guest mode limits using Redis
            const guestLimitKey = `rate_limit:detect:device:${deviceId}`;
            const usages = await redis.incr(guestLimitKey);

            if (usages > 1) { // 1 free experience only
                res.status(402).json({ code: 402, msg: 'Guest free trial exceeded. Please login.' });
                return;
            }
            // Set expire to 1 year maybe, or just keep it
            await redis.expire(guestLimitKey, 365 * 24 * 60 * 60);

        } else if (userId) {
            // Logged in user limits using Postgres Transaction + Optimistic Lock equivalent
            try {
                await prisma.$transaction(async (tx) => {
                    const result = await tx.$executeRaw`
                        UPDATE users 
                        SET available_credits = available_credits - 1 
                        WHERE id = ${userId}::uuid AND available_credits >= 1;
                    `;

                    if (result === 0) {
                        throw new Error('INSUFFICIENT_CREDITS');
                    }

                    await tx.creditsLedger.create({
                        data: {
                            userId: userId,
                            transactionType: 'DETECT_CONSUME',
                            amount: -1,
                        }
                    });
                });
            } catch (txError: any) {
                if (txError.message === 'INSUFFICIENT_CREDITS') {
                    res.status(402).json({ code: 402, msg: 'Insufficient credits. Please recharge.' });
                    return;
                }
                throw txError;
            }
        }

        // 3. Sightengine call
        const data = new FormData();
        data.append('models', 'genai');
        data.append('api_user', process.env.SIGHTENGINE_API_USER || 'dummy_user');
        data.append('api_secret', process.env.SIGHTENGINE_API_SECRET || 'dummy_secret');
        data.append('media', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        let aiScore = 0;
        let isFake = false;
        let rawResult = {};

        try {
            // Unconditionally use Sightengine without fallback mock.
            // Requires SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.
            const sightengineResponse = await axios.post('https://api.sightengine.com/1.0/check.json', data, {
                headers: { ...data.getHeaders() },
                timeout: 15000
            });
            rawResult = sightengineResponse.data;
            aiScore = sightengineResponse.data.type?.ai_generated || 0;
            isFake = aiScore > 0.5;

            // Save history if logged in
            if (userId) {
                await prisma.scanHistory.create({
                    data: {
                        userId,
                        imageUrl: 'https://mock-s3-url.com/image.jpg', // Should upload to S3 here
                        isFake,
                        confidenceScore: aiScore
                    }
                });
            }

            res.status(200).json({
                code: 200,
                msg: 'success',
                data: {
                    is_fake: isFake,
                    confidence_score: aiScore,
                    verdict_code: isFake ? 'HIGH_AI_PROBABILITY' : 'NATURAL',
                    raw_analysis: rawResult
                }
            });

        } catch (apiErr) {
            // Deduct rollback
            if (userId) {
                await prisma.$transaction(async (tx) => {
                    await tx.user.update({
                        where: { id: userId },
                        data: { availableCredits: { increment: 1 } }
                    });
                    await tx.creditsLedger.create({
                        data: {
                            userId: userId,
                            transactionType: 'DETECT_REFUND',
                            amount: 1,
                        }
                    });
                });
            }
            throw apiErr;
        }

    } catch (error: any) {
        console.error('Detection error:', error?.response?.data || error.message);
        res.status(500).json({ code: 500, msg: 'Detection failed' });
    }
});

export default router;
