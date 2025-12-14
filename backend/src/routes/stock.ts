import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();
const warehouseOnly = requireRole('warehouse');

// 获取库存列表
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const stock = await dbAll(`
      SELECT 
        s.*,
        i.code as item_code,
        i.name as item_name,
        i.category,
        i.unit,
        i.brand,
        i.model,
        i.spec,
        i.min_stock,
        l.code as location_code,
        l.name as location_name,
        CASE WHEN s.quantity <= i.min_stock THEN 1 ELSE 0 END as is_low_stock
      FROM stock s
      JOIN items i ON s.item_id = i.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY is_low_stock DESC, s.updated_at DESC
    `);
    res.json(stock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取低库存预警
router.get('/low-stock', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const lowStock = await dbAll(`
      SELECT 
        s.*,
        i.code as item_code,
        i.name as item_name,
        i.category,
        i.unit,
        i.brand,
        i.model,
        i.spec,
        i.min_stock,
        l.code as location_code,
        l.name as location_name,
        (i.min_stock - s.quantity) as shortage
      FROM stock s
      JOIN items i ON s.item_id = i.id
      JOIN locations l ON s.location_id = l.id
      WHERE s.quantity <= i.min_stock
      ORDER BY shortage DESC
    `);
    res.json(lowStock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 入库操作
router.post('/in',
  authenticateToken,
  warehouseOnly,
  [
    body('item_id').isInt().withMessage('物品ID必须为整数'),
    body('location_id').isInt().withMessage('位置ID必须为整数'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        item_id,
        location_id,
        quantity,
        supplier,
        batch_no,
        remark,
        business_date,
        brand,
        model,
        spec,
        serial_no,
        photo_url,
      } = req.body;
      const operator_id = req.userId!;
      const businessDate = business_date || new Date().toISOString().slice(0, 10);

      // 开始事务
      await dbRun('BEGIN TRANSACTION');

      try {
        // 插入入库记录
        const inResult = await dbRun(
          `INSERT INTO stock_in (item_id, location_id, quantity, operator_id, supplier, batch_no, remark, business_date, brand, model, spec, serial_no, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item_id,
            location_id,
            quantity,
            operator_id,
            supplier || null,
            batch_no || null,
            remark || null,
            businessDate,
            brand || null,
            model || null,
            spec || null,
            serial_no || null,
            photo_url || null,
          ]
        );

        // 更新库存
        const existingStock: any = await dbGet(
          'SELECT * FROM stock WHERE item_id = ? AND location_id = ?',
          [item_id, location_id]
        );

        if (existingStock) {
          await dbRun(
            'UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
            [quantity, item_id, location_id]
          );
        } else {
          await dbRun(
            'INSERT INTO stock (item_id, location_id, quantity) VALUES (?, ?, ?)',
            [item_id, location_id, quantity]
          );
        }

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow (item_id, to_location_id, quantity, operator_id, flow_type, related_record_id, remark, serial_no, photo_url)
           VALUES (?, ?, ?, ?, 'in', ?, ?, ?, ?)`,
          [item_id, location_id, quantity, operator_id, inResult.lastID, remark || null, serial_no || null, photo_url || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '入库成功', record_id: inResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 出库操作
router.post('/out',
  authenticateToken,
  warehouseOnly,
  [
    body('item_id').isInt().withMessage('物品ID必须为整数'),
    body('location_id').isInt().withMessage('位置ID必须为整数'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        item_id,
        location_id,
        quantity,
        recipient_id,
        recipient_name,
        purpose,
        remark,
        business_date,
        brand,
        model,
        spec,
        serial_no,
        photo_url,
      } = req.body;
      const operator_id = req.userId!;
      const businessDate = business_date || new Date().toISOString().slice(0, 10);

      // 检查库存是否充足
      const stock: any = await dbGet(
        'SELECT quantity FROM stock WHERE item_id = ? AND location_id = ?',
        [item_id, location_id]
      );

      if (!stock || stock.quantity < quantity) {
        return res.status(400).json({ error: '库存不足' });
      }

      // 开始事务
      await dbRun('BEGIN TRANSACTION');

      try {
        // 插入出库记录
        const outResult = await dbRun(
          `INSERT INTO stock_out (item_id, location_id, quantity, operator_id, recipient_id, recipient_name, purpose, remark, business_date, brand, model, spec, serial_no, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item_id,
            location_id,
            quantity,
            operator_id,
            recipient_id || null,
            recipient_name || null,
            purpose || null,
            remark || null,
            businessDate,
            brand || null,
            model || null,
            spec || null,
            serial_no || null,
            photo_url || null,
          ]
        );

        // 更新库存
        await dbRun(
          'UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
          [quantity, item_id, location_id]
        );

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow (item_id, from_location_id, quantity, operator_id, flow_type, related_record_id, remark, serial_no, photo_url)
           VALUES (?, ?, ?, ?, 'out', ?, ?, ?, ?)`,
          [item_id, location_id, quantity, operator_id, outResult.lastID, remark || null, serial_no || null, photo_url || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '出库成功', record_id: outResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 扫码入库
router.post('/in/scan',
  authenticateToken,
  warehouseOnly,
  [
    body('item_code').notEmpty().withMessage('物品编码不能为空'),
    body('location_code').notEmpty().withMessage('位置编码不能为空'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        item_code,
        location_code,
        quantity,
        supplier,
        batch_no,
        remark,
        business_date,
        brand,
        model,
        spec,
        serial_no,
        photo_url,
      } = req.body;
      const operator_id = req.userId!;
      const businessDate = business_date || new Date().toISOString().slice(0, 10);

      // 查找物品和位置
      const item: any = await dbGet('SELECT id FROM items WHERE code = ?', [item_code]);
      const location: any = await dbGet('SELECT id FROM locations WHERE code = ?', [location_code]);

      if (!item) {
        return res.status(404).json({ error: '物品不存在' });
      }
      if (!location) {
        return res.status(404).json({ error: '位置不存在' });
      }

      // 开始事务
      await dbRun('BEGIN TRANSACTION');

      try {
        // 插入入库记录
        const inResult = await dbRun(
          `INSERT INTO stock_in (item_id, location_id, quantity, operator_id, supplier, batch_no, remark, business_date, brand, model, spec, serial_no, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            location.id,
            quantity,
            operator_id,
            supplier || null,
            batch_no || null,
            remark || null,
            businessDate,
            brand || null,
            model || null,
            spec || null,
            serial_no || null,
            photo_url || null,
          ]
        );

        // 更新库存
        const existingStock: any = await dbGet(
          'SELECT * FROM stock WHERE item_id = ? AND location_id = ?',
          [item.id, location.id]
        );

        if (existingStock) {
          await dbRun(
            'UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
            [quantity, item.id, location.id]
          );
        } else {
          await dbRun(
            'INSERT INTO stock (item_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.id, location.id, quantity]
          );
        }

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow (item_id, to_location_id, quantity, operator_id, flow_type, related_record_id, remark, serial_no, photo_url)
           VALUES (?, ?, ?, ?, 'in', ?, ?, ?, ?)`,
          [item.id, location.id, quantity, operator_id, inResult.lastID, remark || null, serial_no || null, photo_url || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '入库成功', record_id: inResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 扫码出库
router.post('/out/scan',
  authenticateToken,
  warehouseOnly,
  [
    body('item_code').notEmpty().withMessage('物品编码不能为空'),
    body('location_code').notEmpty().withMessage('位置编码不能为空'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        item_code,
        location_code,
        quantity,
        recipient_id,
        recipient_name,
        purpose,
        remark,
        business_date,
        brand,
        model,
        spec,
        serial_no,
        photo_url,
      } = req.body;
      const operator_id = req.userId!;
      const businessDate = business_date || new Date().toISOString().slice(0, 10);

      // 查找物品和位置
      const item: any = await dbGet('SELECT id FROM items WHERE code = ?', [item_code]);
      const location: any = await dbGet('SELECT id FROM locations WHERE code = ?', [location_code]);

      if (!item) {
        return res.status(404).json({ error: '物品不存在' });
      }
      if (!location) {
        return res.status(404).json({ error: '位置不存在' });
      }

      // 检查库存是否充足
      const stock: any = await dbGet(
        'SELECT quantity FROM stock WHERE item_id = ? AND location_id = ?',
        [item.id, location.id]
      );

      if (!stock || stock.quantity < quantity) {
        return res.status(400).json({ error: '库存不足' });
      }

      // 开始事务
      await dbRun('BEGIN TRANSACTION');

      try {
        // 插入出库记录
        const outResult = await dbRun(
          `INSERT INTO stock_out (item_id, location_id, quantity, operator_id, recipient_id, recipient_name, purpose, remark, business_date, brand, model, spec, serial_no, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            location.id,
            quantity,
            operator_id,
            recipient_id || null,
            recipient_name || null,
            purpose || null,
            remark || null,
            businessDate,
            brand || null,
            model || null,
            spec || null,
            serial_no || null,
            photo_url || null,
          ]
        );

        // 更新库存
        await dbRun(
          'UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
          [quantity, item.id, location.id]
        );

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow (item_id, from_location_id, quantity, operator_id, flow_type, related_record_id, remark, serial_no, photo_url)
           VALUES (?, ?, ?, ?, 'out', ?, ?, ?, ?)`,
          [item.id, location.id, quantity, operator_id, outResult.lastID, remark || null, serial_no || null, photo_url || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '出库成功', record_id: outResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

