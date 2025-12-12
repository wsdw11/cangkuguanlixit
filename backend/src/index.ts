import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import stockRoutes from './routes/stock';
import borrowRoutes from './routes/borrow';
import locationRoutes from './routes/location';
import flowRoutes from './routes/flow';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import categoryRoutes from './routes/categories';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/flow', flowRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);

// 静态文件（图片上传）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '仓库管理系统API运行正常' });
});

// 初始化数据库并启动服务器
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('数据库初始化失败:', error);
  process.exit(1);
});

