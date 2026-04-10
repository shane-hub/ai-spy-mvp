"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginRateLimiter = exports.authenticateAdminToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = __importDefault(require("../utils/redis"));
dotenv_1.default.config();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_key_for_ai_spy';
const authenticateAdminToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ code: 401, msg: 'Admin Token Required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ADMIN_JWT_SECRET);
        req.admin = decoded;
        next();
    }
    catch (err) {
        res.status(403).json({ code: 403, msg: 'Invalid or Expired Admin Token' });
    }
};
exports.authenticateAdminToken = authenticateAdminToken;
/**
 * Middleware to prevent brute force attacks on the admin login endpoint
 * Limits failed attempts to 5 per 15 minutes per IP address.
 */
const adminLoginRateLimiter = async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const redisKey = `admin_login_attempts:${ip}`;
    const maxAttempts = 5;
    const lockoutDurationSecs = 15 * 60; // 15 minutes
    try {
        const attemptsStr = await redis_1.default.get(redisKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
        if (attempts >= maxAttempts) {
            const ttl = await redis_1.default.ttl(redisKey);
            res.status(429).json({
                code: 429,
                msg: `Too many failed login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`
            });
            return;
        }
        // We attach logic to increment on error inside the route handler
        next();
    }
    catch (error) {
        console.error('Rate limiter Redis error:', error);
        next(); // allow on redis fail to not lock out legitimate users entirely
    }
};
exports.adminLoginRateLimiter = adminLoginRateLimiter;
