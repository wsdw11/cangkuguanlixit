import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();
const warehouseOrReceiver = requireRole(['warehouse', 'receiver']);

// 获取所有借还记录
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const records = await dbAll(`
      SELECT 
        br.*,
        i.code as item_code,
        i.name as item_name,
        i.unit,
        l.code as location_code,
        l.name as location_name,
        borrower.username as borrower_username,
        borrower.name as borrower_name,
        operator.username as operator_username,
        operator.name as operator_name
      FROM borrow_records br
      JOIN items i ON br.item_id = i.id
      JOIN locations l ON br.location_id = l.id
      JOIN users borrower ON br.borrower_id = borrower.id
      JOIN users operator ON br.operator_id = operator.id
      ORDER BY br.created_at DESC
    `);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 借出物品
router.post('/borrow',
  authenticateToken,
  warehouseOrReceiver,
  [
    body('item_id').isInt().withMessage('物品ID必须为整数'),
    body('location_id').isInt().withMessage('位置ID必须为整数'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
    body('borrower_id').isInt().withMessage('借用人ID必须为整数'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { item_id, location_id, quantity, borrower_id, expected_return_date, remark, photo_url } = req.body;
      const operator_id = req.userId!;

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
        // 插入借出记录
        const borrowResult = await dbRun(
          `INSERT INTO borrow_records 
           (item_id, location_id, quantity, borrower_id, operator_id, type, borrow_date, expected_return_date, status, remark, photo_url)
           VALUES (?, ?, ?, ?, ?, 'borrow', CURRENT_TIMESTAMP, ?, 'borrowed', ?, ?)`,
          [item_id, location_id, quantity, borrower_id, operator_id, expected_return_date || null, remark || null, photo_url || null]
        );

        // 更新库存
        await dbRun(
          'UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
          [quantity, item_id, location_id]
        );

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow 
           (item_id, from_location_id, quantity, operator_id, flow_type, related_record_id, remark)
           VALUES (?, ?, ?, ?, 'borrow', ?, ?)`,
          [item_id, location_id, quantity, operator_id, borrowResult.lastID, remark || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '借出成功', record_id: borrowResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 归还物品
router.post('/return',
  authenticateToken,
  warehouseOrReceiver,
  [
    body('record_id').isInt().withMessage('借还记录ID必须为整数'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { record_id, remark, photo_url } = req.body;
      const operator_id = req.userId!;

      // 查找借出记录
      const borrowRecord: any = await dbGet(
        'SELECT * FROM borrow_records WHERE id = ? AND type = ? AND status = ?',
        [record_id, 'borrow', 'borrowed']
      );

      if (!borrowRecord) {
        return res.status(404).json({ error: '借出记录不存在或已归还' });
      }

      // 开始事务
      await dbRun('BEGIN TRANSACTION');

      try {
        // 插入归还记录
        const returnResult = await dbRun(
          `INSERT INTO borrow_records 
           (item_id, location_id, quantity, borrower_id, operator_id, type, borrow_date, actual_return_date, status, remark, photo_url)
           VALUES (?, ?, ?, ?, ?, 'return', ?, CURRENT_TIMESTAMP, 'returned', ?, ?)`,
          [
            borrowRecord.item_id,
            borrowRecord.location_id,
            borrowRecord.quantity,
            borrowRecord.borrower_id,
            operator_id,
            borrowRecord.borrow_date,
            remark || null,
            photo_url || null
          ]
        );

        // 更新原借出记录状态
        await dbRun(
          'UPDATE borrow_records SET status = ? WHERE id = ?',
          ['returned', record_id]
        );

        // 更新库存
        const existingStock: any = await dbGet(
          'SELECT * FROM stock WHERE item_id = ? AND location_id = ?',
          [borrowRecord.item_id, borrowRecord.location_id]
        );

        if (existingStock) {
          await dbRun(
            'UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
            [borrowRecord.quantity, borrowRecord.item_id, borrowRecord.location_id]
          );
        } else {
          await dbRun(
            'INSERT INTO stock (item_id, location_id, quantity) VALUES (?, ?, ?)',
            [borrowRecord.item_id, borrowRecord.location_id, borrowRecord.quantity]
          );
        }

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow 
           (item_id, to_location_id, quantity, operator_id, flow_type, related_record_id, remark)
           VALUES (?, ?, ?, ?, 'return', ?, ?)`,
          [borrowRecord.item_id, borrowRecord.location_id, borrowRecord.quantity, operator_id, returnResult.lastID, remark || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '归还成功', record_id: returnResult.lastID });
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 扫码借出
router.post('/borrow/scan',
  authenticateToken,
  warehouseOrReceiver,
  [
    body('item_code').notEmpty().withMessage('物品编码不能为空'),
    body('location_code').notEmpty().withMessage('位置编码不能为空'),
    body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
    body('borrower_id').isInt().withMessage('借用人ID必须为整数'),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { item_code, location_code, quantity, borrower_id, expected_return_date, remark } = req.body;
      const operator_id = req.userId!;

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
        // 插入借出记录
        const borrowResult = await dbRun(
          `INSERT INTO borrow_records 
           (item_id, location_id, quantity, borrower_id, operator_id, type, borrow_date, expected_return_date, status, remark)
           VALUES (?, ?, ?, ?, ?, 'borrow', CURRENT_TIMESTAMP, ?, 'borrowed', ?)`,
          [item.id, location.id, quantity, borrower_id, operator_id, expected_return_date || null, remark || null]
        );

        // 更新库存
        await dbRun(
          'UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND location_id = ?',
          [quantity, item.id, location.id]
        );

        // 记录流向
        await dbRun(
          `INSERT INTO item_flow 
           (item_id, from_location_id, quantity, operator_id, flow_type, related_record_id, remark)
           VALUES (?, ?, ?, ?, 'borrow', ?, ?)`,
          [item.id, location.id, quantity, operator_id, borrowResult.lastID, remark || null]
        );

        await dbRun('COMMIT');
        res.status(201).json({ message: '借出成功', record_id: borrowResult.lastID });
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

