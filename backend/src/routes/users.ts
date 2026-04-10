import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

const router = Router();

router.post('/device-token', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { device_token, platform } = req.body;

        if (!userId) return res.status(401).json({ code: 401, msg: 'Unauthorized' });

        if (!device_token) {
            return res.status(400).json({ code: 400, msg: 'Missing device_token' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { deviceToken: device_token }
        });

        res.status(200).json({ code: 200, msg: 'success', data: { success: true } });
    } catch (err: any) {
        console.error('Device token error:', err);
        res.status(500).json({ code: 500, msg: 'Server error' });
    }
});

export default router;
