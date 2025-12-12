import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { dbAll, dbRun, dbGet } from '../database';

const router = express.Router();
const warehouseOnly = requireRole('warehouse');

// 获取全部分类（平铺返回，前端可组装树）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await dbAll(`
      SELECT id, name, parent_id, description, created_at
      FROM categories
      ORDER BY name ASC
    `);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建分类
router.post('/',
  authenticateToken,
  warehouseOnly,
  [
    body('name').notEmpty().withMessage('分类名称不能为空'),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, parent_id, description } = req.body;

      if (parent_id) {
        const parent = await dbGet('SELECT id FROM categories WHERE id = ?', [parent_id]);
        if (!parent) {
          return res.status(400).json({ error: '上级分类不存在' });
        }
      }

      const result = await dbRun(
        'INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)',
        [name, parent_id || null, description || null]
      );
      res.status(201).json({ message: '分类创建成功', id: result.lastID });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 更新分类
router.put('/:id',
  authenticateToken,
  warehouseOnly,
  [
    body('name').notEmpty().withMessage('分类名称不能为空'),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, parent_id, description } = req.body;
      const id = Number(req.params.id);

      if (parent_id && Number(parent_id) === id) {
        return res.status(400).json({ error: '不能将分类的父级设置为自身' });
      }

      if (parent_id) {
        const parent = await dbGet('SELECT id FROM categories WHERE id = ?', [parent_id]);
        if (!parent) {
          return res.status(400).json({ error: '上级分类不存在' });
        }
      }

      await dbRun(
        'UPDATE categories SET name = ?, parent_id = ?, description = ? WHERE id = ?',
        [name, parent_id || null, description || null, id]
      );
      res.json({ message: '分类更新成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 删除分类
router.delete('/:id',
  authenticateToken,
  warehouseOnly,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      // 检查是否有子分类或物品引用
      const child = await dbGet('SELECT id FROM categories WHERE parent_id = ? LIMIT 1', [id]);
      if (child) {
        return res.status(400).json({ error: '请先删除子分类' });
      }
      const itemUsing = await dbGet('SELECT id FROM items WHERE category_id = ? LIMIT 1', [id]);
      if (itemUsing) {
        return res.status(400).json({ error: '已有物品使用此分类，无法删除' });
      }

      await dbRun('DELETE FROM categories WHERE id = ?', [id]);
      res.json({ message: '分类删除成功' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;


