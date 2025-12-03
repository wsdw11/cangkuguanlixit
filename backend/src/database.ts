import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../warehouse.db');

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
  }
});

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 物品表
      db.run(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          unit TEXT DEFAULT '个',
          min_stock INTEGER DEFAULT 0,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 位置表
      db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          area TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 库存表
      db.run(`
        CREATE TABLE IF NOT EXISTS stock (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          location_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          UNIQUE(item_id, location_id)
        )
      `);

      // 入库记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS stock_in (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          location_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          operator_id INTEGER NOT NULL,
          supplier TEXT,
          batch_no TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      // 出库记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS stock_out (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          location_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          operator_id INTEGER NOT NULL,
          recipient_id INTEGER,
          purpose TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (operator_id) REFERENCES users(id),
          FOREIGN KEY (recipient_id) REFERENCES users(id)
        )
      `);

      // 借还记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS borrow_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          location_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          borrower_id INTEGER NOT NULL,
          operator_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('borrow', 'return')),
          borrow_date DATETIME,
          expected_return_date DATETIME,
          actual_return_date DATETIME,
          status TEXT DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue')),
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (borrower_id) REFERENCES users(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      // 物品流向表
      db.run(`
        CREATE TABLE IF NOT EXISTS item_flow (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          from_location_id INTEGER,
          to_location_id INTEGER,
          quantity INTEGER NOT NULL,
          operator_id INTEGER NOT NULL,
          flow_type TEXT NOT NULL CHECK(flow_type IN ('in', 'out', 'transfer', 'borrow', 'return')),
          related_record_id INTEGER,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (from_location_id) REFERENCES locations(id),
          FOREIGN KEY (to_location_id) REFERENCES locations(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      // 创建默认管理员账户（密码: admin123）
      // bcrypt hash for 'admin123': $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
      db.run(`
        INSERT OR IGNORE INTO users (username, password, name, role)
        VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '管理员', 'admin')
      `, (err) => {
        if (err && !err.message.includes('UNIQUE constraint')) {
          console.error('创建默认管理员失败:', err);
        } else {
          console.log('默认管理员账户已创建: admin / admin123');
        }
      });

      console.log('数据库表创建完成');
      resolve();
    });
  });
}

// 封装数据库查询为Promise
export function dbRun(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

