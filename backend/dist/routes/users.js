"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
router.post('/device-token', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { device_token, platform } = req.body;
        if (!userId)
            return res.status(401).json({ code: 401, msg: 'Unauthorized' });
        if (!device_token) {
            return res.status(400).json({ code: 400, msg: 'Missing device_token' });
        }
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { deviceToken: device_token }
        });
        res.status(200).json({ code: 200, msg: 'success', data: { success: true } });
    }
    catch (err) {
        console.error('Device token error:', err);
        res.status(500).json({ code: 500, msg: 'Server error' });
    }
});
exports.default = router;
