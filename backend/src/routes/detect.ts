import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = Router();

// 内存中缓存文件，MVP阶段限制大小为 5MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/detect', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
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
        const data = new FormData();
        data.append('models', 'genai');
        data.append('api_user', process.env.SIGHTENGINE_API_USER || '');
        data.append('api_secret', process.env.SIGHTENGINE_API_SECRET || '');
        data.append('media', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // 4. 发起实际调用 (MOCKED FOR MVP TESTING)
        // const sightengineResponse = await axios.post('https://api.sightengine.com/1.0/check.json', data, {
        //     headers: { ...data.getHeaders() }
        // });
        // const result = sightengineResponse.data;

        // 模拟 API 延迟 (1.5秒) 和随机判定
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockScore = Math.random(); // 0 to 1
        const isFake = mockScore > 0.5;

        res.status(200).json({
            code: 200,
            msg: 'success',
            data: {
                is_fake: isFake,
                confidence_score: mockScore,
                verdict_code: isFake ? 'HIGH_AI_PROBABILITY' : 'NATURAL',
                raw_analysis: { simulated: true, original_score: mockScore }
            }
        });

    } catch (error: any) {
        console.error('Detection API Error:', error?.response?.data || error.message);
        res.status(500).json({
            code: 500,
            msg: 'Failed to process image detection with 3rd party api'
        });
    }
});

export default router;
