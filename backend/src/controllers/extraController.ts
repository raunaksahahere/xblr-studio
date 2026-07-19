import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import crypto from 'crypto';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification status.' });
  }
};

export const getApiKeys = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.user.organizationId },
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve API keys.' });
  }
};

export const createApiKey = async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!name) return res.status(400).json({ error: 'Key name is required' });

    const key = crypto.randomBytes(32).toString('hex');
    const keyPrefix = key.substring(0, 7);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: req.user.organizationId,
        name,
        keyPrefix,
        keyHash,
        userId: req.user.id,
      },
    });

    // Send original key ONLY once upon creation
    res.status(201).json({
      apiKey,
      plainKey: `${keyPrefix}.${key}`,
    });
  } catch (error) {
    console.error('API Key Creation Error:', error);
    res.status(500).json({ error: 'Failed to create API key.' });
  }
};

export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve subscription details.' });
  }
};

export const getKnowledgeGraph = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return sample visual elements for visual diagram building
    const nodes = [
      { id: '1', type: 'COMPANY', label: 'Company A (CIN: L01234DL2010PLC123456)' },
      { id: '2', type: 'FILING', label: 'FY 2024-2025 Filing Project' },
      { id: '3', type: 'TAXONOMY', label: 'mca-indas:EquityShareCapital' },
      { id: '4', type: 'TAXONOMY', label: 'mca-indas:Assets' },
    ];
    const edges = [
      { source: '1', target: '2', type: 'HAS_FILING' },
      { source: '2', target: '3', type: 'MAPPED_TO' },
      { source: '2', target: '4', type: 'MAPPED_TO' },
    ];
    res.json({ nodes, edges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve knowledge graph elements.' });
  }
};
