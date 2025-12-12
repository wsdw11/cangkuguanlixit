import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();
const warehouseOnly = requireRole('warehouse');

// 获取所有位置
router.get('/', authenticateToken, async (req, res) => {
  try {
    const locations = await dbAll('SELECT * FROM locations ORDER BY created_at DESC');
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 根据编码获取位置（用于扫码）
router.get('/code/:code', authenticateToken, async (req, res) => {
  try {
    const location: any = await dbGet('SELECT * FROM locations WHERE code = ?', [req.params.code]);
    if (!location) {
      return res.status(404).json({ error: '位置不存在' });
    }
    res.json(location);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建位置
router.post('/',
  authenticateToken,
  warehouseOnly,
  [
    body('code').notEmpty().withMessage('位置编码不能为空'),
    body('name').notEmpty().withMessage('位置名称不能为空'),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, name, area, description } = req.body;

      // 检查编码是否已存在
      const existing = await dbGet('SELECT id FROM locations WHERE code = ?', [code]);
      if (existing) {
        return res.status(400).json({ error: '位置编码已存在' });
      }

      const result = await dbRun(
        'INSERT INTO locations (code, name, area, description) VALUES (?, ?, ?, ?)',
        [code, name, area || null, description || null]
      );

      res.status(201).json({
        message: '位置创建成功',
        id: result.lastID
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 更新位置
router.put('/:id',
  authenticateToken,
  warehouseOnly,
  async (req: AuthRequest, res) => {
    try {
      const { name, area, description } = req.body;
      await dbRun(
        'UPDATE locations SET name = ?, area = ?, description = ? WHERE id = ?',
        [name, area, description, req.params.id]
      );
      res.json({ message: '位置更新成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 删除位置
router.delete('/:id',
  authenticateToken,
  warehouseOnly,
  async (req: AuthRequest, res) => {
    try {
      await dbRun('DELETE FROM locations WHERE id = ?', [req.params.id]);
      res.json({ message: '位置删除成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

