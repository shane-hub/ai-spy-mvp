"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ code: 401, msg: 'JWT Access Token required' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
        if (err)
            return res.status(401).json({ code: 401, msg: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
};
exports.authenticateToken = authenticateToken;
const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const deviceId = req.headers['x-device-id'];
    if (token) {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
            if (!err) {
                req.user = decoded;
                req.isGuest = false;
            }
            else {
                // Fallback to guest logic if token is invalid
                req.isGuest = true;
                req.deviceId = deviceId || req.ip;
            }
            next();
        });
    }
    else {
        // Guest mode
        if (!deviceId && !req.ip) {
            return res.status(400).json({ code: 400, msg: 'Missing X-Device-ID in headers for guest mode.' });
        }
        req.deviceId = deviceId || req.ip; // fallback to IP
        req.isGuest = true;
        next();
    }
};
exports.optionalAuthenticateToken = optionalAuthenticateToken;
