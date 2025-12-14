import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { dbGet, dbAll } from '../database';

const router = express.Router();

interface CountRow {
  count: number;
}

router.get('/summary', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const [
      totalItemsRow,
      totalLocationsRow,
      totalStockRow,
      lowStockRow,
      categoryStats,
      inOutTrend,
    ] = await Promise.all([
      dbGet<CountRow>(`SELECT COUNT(*) as count FROM items`),
      dbGet<CountRow>(`SELECT COUNT(*) as count FROM locations`),
      dbGet<{ total: number }>(`SELECT IFNULL(SUM(quantity), 0) as total FROM stock`),
      dbGet<CountRow>(`
        SELECT COUNT(*) as count FROM (
          SELECT i.id
          FROM items i
          LEFT JOIN stock s ON s.item_id = i.id
          GROUP BY i.id
          HAVING IFNULL(SUM(s.quantity), 0) <= i.min_stock
        )
      `),
      dbAll(`
        SELECT 
          COALESCE(i.category, '未分类') as category,
          COUNT(DISTINCT i.id) as item_count,
          IFNULL(SUM(s.quantity), 0) as total_quantity
        FROM items i
        LEFT JOIN stock s ON s.item_id = i.id
        GROUP BY COALESCE(i.category, '未分类')
        ORDER BY total_quantity DESC, category
      `),
      dbAll(`
        WITH days AS (
          SELECT date('now', '-' || n || ' day') as d
          FROM generate_series(0, 29) n
        )
        SELECT 
          d as date,
          IFNULL((
            SELECT SUM(quantity) FROM stock_in si WHERE date(si.created_at) = d
          ), 0) as stock_in_qty,
          IFNULL((
            SELECT SUM(quantity) FROM stock_out so WHERE date(so.created_at) = d
          ), 0) as stock_out_qty
        FROM days
        ORDER BY date
      `),
    ]);

    res.json({
      totalItems: totalItemsRow?.count || 0,
      totalLocations: totalLocationsRow?.count || 0,
      totalStockQuantity: totalStockRow?.total || 0,
      lowStockCount: lowStockRow?.count || 0,
      categoryStats,
      inOutTrend,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

