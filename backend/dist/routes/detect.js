"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const FormData_1 = __importDefault(require("FormData"));
const form_data_1 = __importDefault(require("form-data"));
const router = (0, express_1.Router)();
// 内存中缓存文件，MVP阶段限制大小为 5MB
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
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
        // 4. 发起实际调用
        const sightengineResponse = await FormData_1.default.post('https://api.sightengine.com/1.0/check.json', data, {
            headers: { ...data.getHeaders() }
        });
        // 5. 数据清洗与转化 (简化给 Flutter 端的数据)
        const result = sightengineResponse.data;
        // 这里假设 sightengine 的 genai 模型返回 aiprobability 字段
        // 具体需要根据您最终选择的 API 服务商文档进行微调
        const aiScore = result.type?.ai_generated || result.genai || 0;
        const isFake = aiScore > 0.5;
        res.status(200).json({
            code: 200,
            msg: 'success',
            data: {
                is_fake: isFake,
                confidence_score: aiScore,
                verdict_code: isFake ? 'HIGH_AI_PROBABILITY' : 'NATURAL',
                raw_analysis: result // 保留部分源数据供深度图页面分析
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
