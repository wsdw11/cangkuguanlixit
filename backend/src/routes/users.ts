import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { dbAll } from '../database';

const router = express.Router();

// 获取所有用户
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await dbAll(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

