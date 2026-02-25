import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import detectRouter from './routes/detect';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MVP 检测路由
app.use('/api/v1', detectRouter);

// 健康检查接口，供 Nginx / Docker 探活用
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Backend secure proxy is running on port ${port}`);
});
