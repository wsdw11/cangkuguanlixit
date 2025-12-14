const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'warehouse.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    process.exit(1);
  }
  console.log('数据库连接成功');
});

// 重置默认用户
async function resetDefaultUser() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 重置 admin 账号
  db.run(
    `INSERT OR REPLACE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
    ['admin', hashedPassword, '系统管理员', 'admin'],
    function(err) {
      if (err) {
        console.error('创建/更新 admin 用户失败:', err);
      } else {
        console.log('admin 账号已创建/更新: admin / admin123');
      }
    }
  );
  
  // 重置 warehouse 账号
  db.run(
    `INSERT OR REPLACE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
    ['warehouse', hashedPassword, '默认仓管', 'warehouse'],
    function(err) {
      if (err) {
        console.error('创建/更新 warehouse 用户失败:', err);
      } else {
        console.log('warehouse 账号已创建/更新: warehouse / admin123');
      }
      db.close();
    }
  );
}

resetDefaultUser();

