import express from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { dbAll } from '../database';

const router = express.Router();
const adminOrWarehouse = requireRole(['admin', 'warehouse']);

// 获取所有用户
router.get('/', authenticateToken, adminOrWarehouse, async (req: AuthRequest, res: express.Response) => {
  try {
    const users = await dbAll(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users || []);
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: error.message || '获取用户列表失败' });
  }
});

export default router;

