"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middlewares/auth");
const redis_1 = __importDefault(require("../utils/redis"));
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ code: 400, msg: 'Email is required' });
        // Simple Rate Limit: Check if OTP already exists to prevent spam
        const existing = await redis_1.default.get(`otp:${email}`);
        if (existing) {
            return res.status(429).json({ code: 429, msg: 'Please wait before requesting another code' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set OTP with 5 mins expiry
        await redis_1.default.set(`otp:${email}`, otp, 'EX', 300);
        await (0, email_1.sendOtpEmail)(email, otp);
        res.status(200).json({ code: 200, msg: 'OTP sent successfully' });
    }
    catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ code: 500, msg: 'Failed to send OTP' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { provider, access_token, id_token, email: payloadEmail, otp } = req.body;
        if (!provider) {
            return res.status(400).json({ code: 400, msg: 'Missing credentials' });
        }
        let providerUid = '';
        let email = null;
        let displayName = null;
        // Simulate third party SDK validation
        if (provider === 'WECHAT') {
            providerUid = `mock_wx_${Math.random().toString(36).substring(7)}`;
            displayName = 'WeChat User';
        }
        else if (provider === 'GMAIL') {
            providerUid = `mock_g_${Math.random().toString(36).substring(7)}`;
            email = 'mock@gmail.com';
            displayName = 'Google User';
        }
        else if (provider === 'PHONE') {
            providerUid = access_token || `phone_${Math.random().toString(36).substring(7)}`;
            displayName = `用户_${providerUid.substring(0, 4)}***`;
        }
        else if (provider === 'EMAIL') {
            if (!payloadEmail || !otp)
                return res.status(400).json({ code: 400, msg: 'Email and OTP required' });
            const savedOtp = await redis_1.default.get(`otp:${payloadEmail}`);
            if (!savedOtp || savedOtp !== otp) {
                return res.status(401).json({ code: 401, msg: 'Invalid or expired OTP' });
            }
            // Valid OTP, delete it
            await redis_1.default.del(`otp:${payloadEmail}`);
            providerUid = payloadEmail;
            email = payloadEmail;
            displayName = `用户_${payloadEmail.split('@')[0]}`;
        }
        else {
            return res.status(400).json({ code: 400, msg: 'Unknown provider' });
        }
        // Upsert user
        const dbProvider = provider;
        let user = await prisma_1.default.user.findUnique({
            where: {
                authProvider_providerUid: {
                    authProvider: dbProvider,
                    providerUid
                }
            }
        });
        if (!user) {
            user = await prisma_1.default.user.create({
                data: {
                    authProvider: dbProvider,
                    providerUid,
                    displayName,
                    email,
                    availableCredits: 3 // Default 3 credits on signup
                }
            });
            // Log welcome gift
            await prisma_1.default.creditsLedger.create({
                data: {
                    userId: user.id,
                    transactionType: 'SIGNUP_GIFT',
                    amount: 3,
                }
            });
        }
        // Sign JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id, credits: user.availableCredits }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(200).json({
            code: 200,
            msg: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    credits: user.availableCredits,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl
                }
            }
        });
    }
    catch (err) {
        console.error('Auth login error:', err);
        res.status(500).json({ code: 500, msg: 'Internal server error' });
    }
});
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ code: 401, msg: 'Unauthorized' });
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ code: 404, msg: 'User not found' });
        res.status(200).json({
            code: 200,
            data: {
                id: user.id,
                credits: user.availableCredits,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl
            }
        });
    }
    catch (err) {
        res.status(500).json({ code: 500, msg: 'Internal server error' });
    }
});
exports.default = router;
