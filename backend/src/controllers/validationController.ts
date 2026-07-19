import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';

export const getValidationErrors = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;

  try {
    const errors = await prisma.validationError.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve validation errors.' });
  }
};

export const clearValidationError = async (req: AuthenticatedRequest, res: Response) => {
  const { errorId } = req.params;

  try {
    const updated = await prisma.validationError.update({
      where: { id: errorId },
      data: {
        isCleared: true,
        clearedById: req.user?.id || 'SYSTEM',
      },
    });

    // Audit Log (Stringify details for SQLite)
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'CLEAR_VALIDATION_ERROR',
        targetId: errorId,
        targetType: 'ValidationError',
        details: JSON.stringify({ code: updated.errorCode, msg: updated.message }),
      },
    });

    res.json({
      message: 'Validation error cleared successfully',
      error: updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear validation error.' });
  }
};
