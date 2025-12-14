import express from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { dbAll } from '../database';

const router = express.Router();
const warehouseOnly = requireRole('warehouse');

// 获取所有用户
router.get('/', authenticateToken, warehouseOnly, async (req: AuthRequest, res: express.Response) => {
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

