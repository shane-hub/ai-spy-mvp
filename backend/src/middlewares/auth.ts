import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        credits: number;
        // other decoded fields
    };
    deviceId?: string;
    isGuest?: boolean;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ code: 401, msg: 'JWT Access Token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, decoded: any) => {
        if (err) return res.status(401).json({ code: 401, msg: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const deviceId = req.headers['x-device-id'] as string;

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, decoded: any) => {
            if (!err) {
                req.user = decoded;
                req.isGuest = false;
            } else {
                // Fallback to guest logic if token is invalid
                req.isGuest = true;
                req.deviceId = deviceId || req.ip;
            }
            next();
        });
    } else {
        // Guest mode
        if (!deviceId && !req.ip) {
            return res.status(400).json({ code: 400, msg: 'Missing X-Device-ID in headers for guest mode.' });
        }
        req.deviceId = deviceId || (req.ip as string); // fallback to IP
        req.isGuest = true;
        next();
    }
};
