"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const router = (0, express_1.Router)();
// 内存中缓存文件，提升限额为 20MB 适配手机原图
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});
router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        // 1. 防盗刷：校验暗号
        const clientSecret = req.body.auth_token;
        if (clientSecret !== process.env.APP_CLIENT_SECRET) {
            res.status(403).json({ code: 403, msg: 'Invalid authorization token' });
            return;
        }
        // 2. 存在性检查
        if (!req.file) {
            res.status(400).json({ code: 400, msg: 'No image provided' });
            return;
        }
        // 3. 组装发给 Sightengine (第三方API) 的请求
        // 替换为真实的模型参数，例如: models=genai
        const data = new form_data_1.default();
        data.append('models', 'genai');
        data.append('api_user', process.env.SIGHTENGINE_API_USER || '');
        data.append('api_secret', process.env.SIGHTENGINE_API_SECRET || '');
        data.append('media', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });
        // 4. 发起实际调用 (Live Sightengine Integration)
        const sightengineResponse = await axios_1.default.post('https://api.sightengine.com/1.0/check.json', data, {
            headers: { ...data.getHeaders() }
        });
        const result = sightengineResponse.data;
        // Sightengine's 'genai' model returns an 'ai_generated' probability score
        const aiScore = result.type?.ai_generated || 0;
        const isFake = aiScore > 0.5; // We consider anything > 0.5 as fake
        res.status(200).json({
            code: 200,
            msg: 'success',
            data: {
                is_fake: isFake,
                confidence_score: aiScore,
                verdict_code: isFake ? 'HIGH_AI_PROBABILITY' : 'NATURAL',
                raw_analysis: result
            }
        });
    }
    catch (error) {
        console.error('Detection API Error:', error?.response?.data || error.message);
        res.status(500).json({
            code: 500,
            msg: 'Failed to process image detection with 3rd party api'
        });
    }
});
exports.default = router;
