import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import prisma from '../config/db';

export const requirePermission = (permissionName: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Query database to check if role matches permission
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          role: {
            name: req.user.role,
          },
          permission: {
            name: permissionName,
          },
        },
      });

      if (!rolePermission && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('RBAC Authorization Error:', error);
      res.status(500).json({ error: 'Internal server authorization check failed' });
    }
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied for this role' });
    }

    next();
  };
};
