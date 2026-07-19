import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';

export const getAutomationRules = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let rules = await prisma.automationRule.findMany({
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    // Seed default recipes if none exist
    if (rules.length === 0) {
      const defaultRecipes = [
        { name: 'Auto-classify uploaded documents', trigger: 'ON_UPLOAD', action: 'CLASSIFY_DOC' },
        { name: 'Auto-detect duplicate files', trigger: 'ON_UPLOAD', action: 'DEDUPLICATE' },
        { name: 'Auto-create missing-input suggestions', trigger: 'ON_Ingest_Complete', action: 'DETECT_MISSING' },
        { name: 'Auto-route low-confidence items to review', trigger: 'ON_INGEST_COMPLETE', action: 'ROUTE_TO_REVIEW' },
        { name: 'Auto-notify assigned reviewer on complete', trigger: 'ON_INGEST_COMPLETE', action: 'NOTIFY_REVIEWER' },
        { name: 'Auto-create processing failure alerts', trigger: 'ON_INGEST_FAILED', action: 'ALERT_FAILURE' },
        { name: 'Auto-draft client document requests', trigger: 'ON_MISSING_DETECTED', action: 'DRAFT_REQUEST' },
      ];

      for (const recipe of defaultRecipes) {
        await prisma.automationRule.create({
          data: {
            name: recipe.name,
            trigger: recipe.trigger,
            action: recipe.action,
            isEnabled: true,
          },
        });
      }

      rules = await prisma.automationRule.findMany({
        include: {
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
        },
      });
    }

    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve automation rules.' });
  }
};

export const updateAutomationRule = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isEnabled, configJson } = req.body;

  try {
    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
        configJson: configJson !== undefined ? JSON.stringify(configJson) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'AUTOMATION_RULE_UPDATED',
        targetId: id,
        targetType: 'AutomationRule',
        details: JSON.stringify({ isEnabled, configJson }),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update automation rule.' });
  }
};

export const triggerAutomationRule = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found.' });
    }

    // Register starting run
    const run = await prisma.automationRun.create({
      data: {
        ruleId: id,
        status: 'RUNNING',
      },
    });

    // Simulate recipe processing execution
    setTimeout(async () => {
      try {
        await prisma.automationRun.update({
          where: { id: run.id },
          data: {
            status: 'SUCCEEDED',
            completedAt: new Date(),
            logJson: JSON.stringify({ message: `Recipe successfully triggered. Action '${rule.action}' executed for trigger '${rule.trigger}'.` }),
          },
        });
      } catch (err) {}
    }, 1000);

    res.json({
      message: 'Automation recipe triggered successfully in background.',
      runId: run.id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger automation rule.' });
  }
};
