import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../utils/prisma';
import redis from '../utils/redis';
import { authenticateAdminToken, adminLoginRateLimiter } from '../middlewares/adminAuth';

dotenv.config();

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_key_for_ai_spy';

router.post('/login', adminLoginRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const { password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const redisKey = `admin_login_attempts:${ip}`;

    if (password === ADMIN_PASSWORD) {
        // Success - generate token and clear rate limit attempts
        const token = jwt.sign({ role: 'superadmin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
        await redis.del(redisKey); // Clear attempts
        res.json({ code: 200, msg: 'Login successful', data: { token } });
    } else {
        // Failed attempt - increment Redis counter
        const attemptsStr = await redis.get(redisKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
        await redis.set(redisKey, (attempts + 1).toString(), 'EX', 15 * 60); // 15 mins expiry

        res.status(401).json({ code: 401, msg: 'Invalid Admin Password' });
    }
});

router.get('/stats', authenticateAdminToken, async (req: Request, res: Response): Promise<void> => {
    try {
        // Redis Cache implementation for expensive count queries
        const CACHE_KEY = 'admin_stats_overview';
        const cachedStr = await redis.get(CACHE_KEY);

        // If we have a fresh cache within 60s, return it immediately to avoid DB load
        if (cachedStr) {
            res.json({ code: 200, msg: 'success (cached)', data: JSON.parse(cachedStr) });
            return;
        }

        // Heavy Database Queries
        const totalUsers = await prisma.user.count();
        const totalRevenueResult = await prisma.order.aggregate({
            _sum: { amountCents: true },
            where: { status: 'SUCCESS' }
        });
        const totalScans = await prisma.scanHistory.count();
        const fakeScans = await prisma.scanHistory.count({ where: { isFake: true } });

        // Lightweight queries
        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, displayName: true, createdAt: true, authProvider: true }
        });

        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            where: { status: 'SUCCESS' },
            select: { orderNo: true, amountCents: true, packageType: true, paidAt: true, user: { select: { displayName: true } } }
        });

        const data = {
            metrics: {
                total_users: totalUsers,
                total_revenue_cny: (totalRevenueResult._sum?.amountCents || 0) / 100,
                total_scans: totalScans,
                fake_scans_ratio: totalScans > 0 ? (fakeScans / totalScans) : 0
            },
            recent_users: recentUsers,
            recent_orders: recentOrders
        };

        // Store into cache slice with 60 second Time To Live
        await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', 60);

        res.json({
            code: 200,
            msg: 'success',
            data
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ code: 500, msg: 'Server DB Compute error' });
    }
});

export default router;
