import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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
      // 分类表（多级）
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id)
        )
      `);

      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'warehouse',
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
          category_id INTEGER,
          unit TEXT DEFAULT '个',
          min_stock INTEGER DEFAULT 0,
          brand TEXT,
          model TEXT,
          spec TEXT,
          description TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
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
          brand TEXT,
          model TEXT,
          spec TEXT,
          serial_no TEXT,
          photo_url TEXT,
          supplier TEXT,
          batch_no TEXT,
          remark TEXT,
          business_date DATETIME DEFAULT CURRENT_DATE,
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
          recipient_name TEXT,
          brand TEXT,
          model TEXT,
          spec TEXT,
          serial_no TEXT,
          photo_url TEXT,
          purpose TEXT,
          remark TEXT,
          business_date DATETIME DEFAULT CURRENT_DATE,
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
          photo_url TEXT,
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
          serial_no TEXT,
          photo_url TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (from_location_id) REFERENCES locations(id),
          FOREIGN KEY (to_location_id) REFERENCES locations(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      // 序列号表（设备类精细追踪）
      db.run(`
        CREATE TABLE IF NOT EXISTS item_serials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          serial_no TEXT NOT NULL,
          brand TEXT,
          model TEXT,
          spec TEXT,
          status TEXT DEFAULT 'in_stock' CHECK(status IN ('in_stock', 'borrowed', 'out', 'repair')),
          location_id INTEGER,
          photo_url TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(item_id, serial_no),
          FOREIGN KEY (item_id) REFERENCES items(id),
          FOREIGN KEY (location_id) REFERENCES locations(id)
        )
      `);

      // 创建默认管理员账户（密码: admin123）
      bcrypt.hash('admin123', 10).then((hashedPassword) => {
        // 创建 admin 账号
        db.run(`
          INSERT OR REPLACE INTO users (username, password, name, role)
          VALUES ('admin', ?, '系统管理员', 'admin')
        `, [hashedPassword], (err) => {
          if (err) {
            console.error('创建默认管理员失败:', err);
          } else {
            console.log('默认管理员账户已创建/更新: admin / admin123');
          }
        });
        
        // 创建 warehouse 账号
        db.run(`
          INSERT OR REPLACE INTO users (username, password, name, role)
          VALUES ('warehouse', ?, '默认仓管', 'warehouse')
        `, [hashedPassword], (err) => {
          if (err) {
            console.error('创建默认仓管失败:', err);
          } else {
            console.log('默认仓管账户已创建/更新: warehouse / admin123');
          }
        });
      }).catch((err) => {
        console.error('密码加密失败:', err);
        // 如果加密失败，使用预计算的hash作为后备
        const fallbackHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
        db.run(`
          INSERT OR REPLACE INTO users (username, password, name, role)
          VALUES ('admin', ?, '系统管理员', 'admin')
        `, [fallbackHash], (err) => {
          if (err) {
            console.error('创建默认管理员失败:', err);
          } else {
            console.log('默认管理员账户已创建/更新（使用后备hash）: admin / admin123');
          }
        });
        db.run(`
          INSERT OR REPLACE INTO users (username, password, name, role)
          VALUES ('warehouse', ?, '默认仓管', 'warehouse')
        `, [fallbackHash], (err) => {
          if (err) {
            console.error('创建默认仓管失败:', err);
          } else {
            console.log('默认仓管账户已创建/更新（使用后备hash）: warehouse / admin123');
          }
        });
      });

      // 兼容已有数据库，尝试新增缺失列
      const addColumnIfNotExists = (table: string, columnDefinition: string) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`为表 ${table} 添加列失败:`, err.message);
          }
        });
      };

      addColumnIfNotExists('items', 'brand TEXT');
      addColumnIfNotExists('items', 'model TEXT');
      addColumnIfNotExists('items', 'spec TEXT');
      addColumnIfNotExists('items', 'remark TEXT');
      addColumnIfNotExists('items', 'category_id INTEGER');
      addColumnIfNotExists('stock_in', 'business_date DATETIME');
      addColumnIfNotExists('stock_out', 'business_date DATETIME');
      addColumnIfNotExists('stock_out', 'recipient_name TEXT');
      addColumnIfNotExists('stock_in', 'brand TEXT');
      addColumnIfNotExists('stock_in', 'model TEXT');
      addColumnIfNotExists('stock_in', 'spec TEXT');
      addColumnIfNotExists('stock_in', 'serial_no TEXT');
      addColumnIfNotExists('stock_in', 'photo_url TEXT');
      addColumnIfNotExists('stock_out', 'brand TEXT');
      addColumnIfNotExists('stock_out', 'model TEXT');
      addColumnIfNotExists('stock_out', 'spec TEXT');
      addColumnIfNotExists('stock_out', 'serial_no TEXT');
      addColumnIfNotExists('stock_out', 'photo_url TEXT');
      addColumnIfNotExists('borrow_records', 'photo_url TEXT');
      addColumnIfNotExists('item_flow', 'serial_no TEXT');
      addColumnIfNotExists('item_flow', 'photo_url TEXT');

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

