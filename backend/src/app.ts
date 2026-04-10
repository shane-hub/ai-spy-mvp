import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import paymentsRouter from './routes/payments';
import detectRouter from './routes/detect';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MVP 路由
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1', detectRouter);
app.use('/api/v1/admin', adminRouter);

import path from 'path';

// 健康检查接口，供 Nginx / Docker 探活用
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================
// 统一静态托管配置 (Unified Static Serving)
// ============================================
const adminDistPath = path.join(__dirname, '../../admin-panel/dist');
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

// Serve Admin Panel Static Assets
app.use('/admin', express.static(adminDistPath));
// Catch-all route for Admin Panel Client-Side Routing (React Router)
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
});

// Serve Main Frontend Static Assets
app.use(express.static(frontendDistPath));
// Catch-all route for Main Frontend Client-Side Routing
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Backend secure proxy is running on port ${port}`);
});
