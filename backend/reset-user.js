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
  
  db.run(
    `UPDATE users SET password = ? WHERE username = 'warehouse'`,
    [hashedPassword],
    function(err) {
      if (err) {
        console.error('更新用户失败:', err);
      } else {
        if (this.changes > 0) {
          console.log('用户密码已更新: warehouse / admin123');
        } else {
          // 如果用户不存在，创建新用户
          db.run(
            `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
            ['warehouse', hashedPassword, '默认仓管', 'warehouse'],
            (err) => {
              if (err) {
                console.error('创建用户失败:', err);
              } else {
                console.log('用户已创建: warehouse / admin123');
              }
              db.close();
            }
          );
        }
      }
    }
  );
  
  // 检查是否有用户
  db.get('SELECT * FROM users WHERE username = ?', ['warehouse'], (err, row) => {
    if (err) {
      console.error('查询用户失败:', err);
      db.close();
    } else if (!row) {
      // 用户不存在，创建
      bcrypt.hash(password, 10).then((hash) => {
        db.run(
          `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
          ['warehouse', hash, '默认仓管', 'warehouse'],
          (err) => {
            if (err) {
              console.error('创建用户失败:', err);
            } else {
              console.log('用户已创建: warehouse / admin123');
            }
            db.close();
          }
        );
      });
    } else {
      // 用户存在，更新密码
      bcrypt.hash(password, 10).then((hash) => {
        db.run(
          `UPDATE users SET password = ? WHERE username = 'warehouse'`,
          [hash],
          (err) => {
            if (err) {
              console.error('更新用户失败:', err);
            } else {
              console.log('用户密码已更新: warehouse / admin123');
            }
            db.close();
          }
        );
      });
    }
  });
}

resetDefaultUser();

