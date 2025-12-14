import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { dbGet, dbRun } from '../database';

const router = express.Router();

// 注册
router.post('/register',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('role').optional().isIn(['warehouse', 'receiver']).withMessage('角色不合法'),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, name, role = 'receiver' } = req.body;

      // 检查用户名是否已存在
      const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      const result = await dbRun(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, role]
      );

      res.status(201).json({
        message: '注册成功',
        userId: result.lastID
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 登录
router.post('/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // 查找用户
      const user: any = await dbGet(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 生成JWT
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        secret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

