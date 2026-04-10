import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import redis from '../utils/redis';

dotenv.config();

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_key_for_ai_spy';

export interface AdminAuthRequest extends Request {
    admin?: any;
}

export const authenticateAdminToken = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ code: 401, msg: 'Admin Token Required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(403).json({ code: 403, msg: 'Invalid or Expired Admin Token' });
    }
};

/**
 * Middleware to prevent brute force attacks on the admin login endpoint
 * Limits failed attempts to 5 per 15 minutes per IP address.
 */
export const adminLoginRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const redisKey = `admin_login_attempts:${ip}`;
    const maxAttempts = 5;
    const lockoutDurationSecs = 15 * 60; // 15 minutes

    try {
        const attemptsStr = await redis.get(redisKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

        if (attempts >= maxAttempts) {
            const ttl = await redis.ttl(redisKey);
            res.status(429).json({
                code: 429,
                msg: `Too many failed login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`
            });
            return;
        }

        // We attach logic to increment on error inside the route handler
        next();
    } catch (error) {
        console.error('Rate limiter Redis error:', error);
        next(); // allow on redis fail to not lock out legitimate users entirely
    }
};
