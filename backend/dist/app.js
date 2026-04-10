"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const payments_1 = __importDefault(require("./routes/payments"));
const detect_1 = __importDefault(require("./routes/detect"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// MVP 路由
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/payments', payments_1.default);
app.use('/api/v1', detect_1.default);
app.use('/api/v1/admin', admin_1.default);
const path_1 = __importDefault(require("path"));
// 健康检查接口，供 Nginx / Docker 探活用
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});
// ============================================
// 统一静态托管配置 (Unified Static Serving)
// ============================================
const adminDistPath = path_1.default.join(__dirname, '../../admin-panel/dist');
const frontendDistPath = path_1.default.join(__dirname, '../../frontend/dist');
// Serve Admin Panel Static Assets
app.use('/admin', express_1.default.static(adminDistPath));
// Catch-all route for Admin Panel Client-Side Routing (React Router)
app.get('/admin/*', (req, res) => {
    res.sendFile(path_1.default.join(adminDistPath, 'index.html'));
});
// Serve Main Frontend Static Assets
app.use(express_1.default.static(frontendDistPath));
// Catch-all route for Main Frontend Client-Side Routing
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
});
app.listen(port, () => {
    console.log(`Backend secure proxy is running on port ${port}`);
});
