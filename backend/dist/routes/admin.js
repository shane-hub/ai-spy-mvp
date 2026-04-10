"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const redis_1 = __importDefault(require("../utils/redis"));
const adminAuth_1 = require("../middlewares/adminAuth");
dotenv_1.default.config();
const router = (0, express_1.Router)();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_key_for_ai_spy';
router.post('/login', adminAuth_1.adminLoginRateLimiter, async (req, res) => {
    const { password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const redisKey = `admin_login_attempts:${ip}`;
    if (password === ADMIN_PASSWORD) {
        // Success - generate token and clear rate limit attempts
        const token = jsonwebtoken_1.default.sign({ role: 'superadmin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
        await redis_1.default.del(redisKey); // Clear attempts
        res.json({ code: 200, msg: 'Login successful', data: { token } });
    }
    else {
        // Failed attempt - increment Redis counter
        const attemptsStr = await redis_1.default.get(redisKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
        await redis_1.default.set(redisKey, (attempts + 1).toString(), 'EX', 15 * 60); // 15 mins expiry
        res.status(401).json({ code: 401, msg: 'Invalid Admin Password' });
    }
});
router.get('/stats', adminAuth_1.authenticateAdminToken, async (req, res) => {
    try {
        // Redis Cache implementation for expensive count queries
        const CACHE_KEY = 'admin_stats_overview';
        const cachedStr = await redis_1.default.get(CACHE_KEY);
        // If we have a fresh cache within 60s, return it immediately to avoid DB load
        if (cachedStr) {
            res.json({ code: 200, msg: 'success (cached)', data: JSON.parse(cachedStr) });
            return;
        }
        // Heavy Database Queries
        const totalUsers = await prisma_1.default.user.count();
        const totalRevenueResult = await prisma_1.default.order.aggregate({
            _sum: { amountCents: true },
            where: { status: 'SUCCESS' }
        });
        const totalScans = await prisma_1.default.scanHistory.count();
        const fakeScans = await prisma_1.default.scanHistory.count({ where: { isFake: true } });
        // Lightweight queries
        const recentUsers = await prisma_1.default.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, displayName: true, createdAt: true, authProvider: true }
        });
        const recentOrders = await prisma_1.default.order.findMany({
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
        await redis_1.default.set(CACHE_KEY, JSON.stringify(data), 'EX', 60);
        res.json({
            code: 200,
            msg: 'success',
            data
        });
    }
    catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ code: 500, msg: 'Server DB Compute error' });
    }
});
exports.default = router;
