import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供访问令牌' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: '无效的访问令牌' });
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
}

export function requireRole(roles: string | string[]) {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roleList.includes(req.userRole)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 兼容旧调用名
export const requireAdmin = requireRole('warehouse');

