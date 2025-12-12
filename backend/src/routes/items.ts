import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();
const warehouseOnly = requireRole('warehouse');
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('仅支持 Excel 文件'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
  warehouseOnly,
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

      const {
        code,
        name,
        category,
        category_id,
        unit,
        min_stock,
        description,
        brand,
        model,
        spec,
        remark,
      } = req.body;

      // 检查编码是否已存在
      const existing = await dbGet('SELECT id FROM items WHERE code = ?', [code]);
      if (existing) {
        return res.status(400).json({ error: '物品编码已存在' });
      }

      const result = await dbRun(
        `INSERT INTO items 
          (code, name, category, category_id, unit, min_stock, description, brand, model, spec, remark) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          name,
          category ?? null,
          category_id ?? null,
          unit || '个',
          typeof min_stock === 'number' ? min_stock : 0,
          description ?? null,
          brand ?? null,
          model ?? null,
          spec ?? null,
          remark ?? null,
        ]
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
  warehouseOnly,
  async (req: AuthRequest, res) => {
    try {
      const {
        name,
        category,
        category_id,
        unit,
        min_stock,
        description,
        brand,
        model,
        spec,
        remark,
      } = req.body;
      await dbRun(
        `UPDATE items 
          SET name = ?, category = ?, category_id = ?, unit = ?, min_stock = ?, description = ?, brand = ?, model = ?, spec = ?, remark = ?
         WHERE id = ?`,
        [
          name,
          category ?? null,
          category_id ?? null,
          unit || '个',
          typeof min_stock === 'number' ? min_stock : 0,
          description ?? null,
          brand ?? null,
          model ?? null,
          spec ?? null,
          remark ?? null,
          req.params.id,
        ]
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
  warehouseOnly,
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

// 批量导入物品
router.post(
  '/import',
  authenticateToken,
  warehouseOnly,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '未收到文件' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

      if (!rows.length) {
        return res.status(400).json({ error: '文件为空' });
      }

      const errors: any[] = [];
      let successCount = 0;

      const ensureCategory = async (pathString?: string): Promise<number | null> => {
        if (!pathString) return null;
        const parts = pathString.split('/').map((p) => p.trim()).filter(Boolean);
        if (!parts.length) return null;
        let parentId: number | null = null;
        for (const name of parts) {
          const existing = await dbGet<{ id: number }>(
            'SELECT id FROM categories WHERE name = ? AND IFNULL(parent_id, 0) = IFNULL(?, 0)',
            [name, parentId ?? 0]
          );
          if (existing) {
            parentId = existing.id;
          } else {
            const insert = await dbRun(
              'INSERT INTO categories (name, parent_id) VALUES (?, ?)',
              [name, parentId]
            );
            parentId = insert.lastID;
          }
        }
        return parentId;
      };

      await dbRun('BEGIN TRANSACTION');
      try {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const code = String(row['物品编码'] || '').trim();
          const name = String(row['物品名称'] || '').trim();
          if (!code || !name) {
            errors.push({ row: i + 2, error: '物品编码或名称为空' }); // header assumed row1
            continue;
          }
          const categoryPath = String(row['分类'] || row['分类路径'] || '').trim();
          const unit = String(row['单位'] || '个').trim() || '个';
          const minStock = Number(row['最低库存'] || 0) || 0;
          const brand = String(row['品牌'] || '').trim() || null;
          const model = String(row['型号'] || '').trim() || null;
          const spec = String(row['规格'] || '').trim() || null;
          const remark = String(row['备注'] || '').trim() || null;
          const description = String(row['描述'] || '').trim() || null;

          const existing = await dbGet('SELECT id FROM items WHERE code = ?', [code]);
          if (existing) {
            errors.push({ row: i + 2, error: '编码已存在，跳过' });
            continue;
          }

          const category_id = await ensureCategory(categoryPath);

          await dbRun(
            `INSERT INTO items (code, name, category, category_id, unit, min_stock, description, brand, model, spec, remark)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              code,
              name,
              categoryPath || null,
              category_id,
              unit,
              minStock,
              description,
              brand,
              model,
              spec,
              remark,
            ]
          );
          successCount += 1;
        }
        await dbRun('COMMIT');
      } catch (err) {
        await dbRun('ROLLBACK');
        throw err;
      }

      res.json({
        message: '导入完成',
        success: successCount,
        failed: errors.length,
        errors,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

