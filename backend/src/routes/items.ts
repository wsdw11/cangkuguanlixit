import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();

// 获取所有物品
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await dbAll('SELECT * FROM items ORDER BY created_at DESC');
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 根据编码获取物品（用于扫码）
router.get('/code/:code', authenticateToken, async (req, res) => {
  try {
    const item: any = await dbGet('SELECT * FROM items WHERE code = ?', [req.params.code]);
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建物品
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('code').notEmpty().withMessage('物品编码不能为空'),
    body('name').notEmpty().withMessage('物品名称不能为空'),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, name, category, unit, min_stock, description } = req.body;

      // 检查编码是否已存在
      const existing = await dbGet('SELECT id FROM items WHERE code = ?', [code]);
      if (existing) {
        return res.status(400).json({ error: '物品编码已存在' });
      }

      const result = await dbRun(
        'INSERT INTO items (code, name, category, unit, min_stock, description) VALUES (?, ?, ?, ?, ?, ?)',
        [code, name, category || null, unit || '个', min_stock || 0, description || null]
      );

      res.status(201).json({
        message: '物品创建成功',
        id: result.lastID
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 更新物品
router.put('/:id',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { name, category, unit, min_stock, description } = req.body;
      await dbRun(
        'UPDATE items SET name = ?, category = ?, unit = ?, min_stock = ?, description = ? WHERE id = ?',
        [name, category, unit, min_stock, description, req.params.id]
      );
      res.json({ message: '物品更新成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 删除物品
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      await dbRun('DELETE FROM items WHERE id = ?', [req.params.id]);
      res.json({ message: '物品删除成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

