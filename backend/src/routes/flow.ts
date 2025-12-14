import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { dbAll, dbGet } from '../database';

const router = express.Router();

// 获取物品流向记录
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { item_id, location_id, flow_type, start_date, end_date } = req.query;

    let sql = `
      SELECT 
        f.*,
        i.code as item_code,
        i.name as item_name,
        i.unit,
        from_loc.code as from_location_code,
        from_loc.name as from_location_name,
        to_loc.code as to_location_code,
        to_loc.name as to_location_name,
        u.username as operator_username,
        u.name as operator_name
      FROM item_flow f
      JOIN items i ON f.item_id = i.id
      LEFT JOIN locations from_loc ON f.from_location_id = from_loc.id
      LEFT JOIN locations to_loc ON f.to_location_id = to_loc.id
      JOIN users u ON f.operator_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (item_id) {
      sql += ' AND f.item_id = ?';
      params.push(item_id);
    }
    if (location_id) {
      sql += ' AND (f.from_location_id = ? OR f.to_location_id = ?)';
      params.push(location_id, location_id);
    }
    if (flow_type) {
      sql += ' AND f.flow_type = ?';
      params.push(flow_type);
    }
    if (start_date) {
      sql += ' AND f.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND f.created_at <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY f.created_at DESC';

    const flows = await dbAll(sql, params);
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取特定物品的流向
router.get('/item/:item_id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const flows = await dbAll(`
      SELECT 
        f.*,
        i.code as item_code,
        i.name as item_name,
        from_loc.code as from_location_code,
        from_loc.name as from_location_name,
        to_loc.code as to_location_code,
        to_loc.name as to_location_name,
        u.username as operator_username,
        u.name as operator_name
      FROM item_flow f
      JOIN items i ON f.item_id = i.id
      LEFT JOIN locations from_loc ON f.from_location_id = from_loc.id
      LEFT JOIN locations to_loc ON f.to_location_id = to_loc.id
      JOIN users u ON f.operator_id = u.id
      WHERE f.item_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.item_id]);
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

