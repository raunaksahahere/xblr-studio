import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';

export const overrideFactValue = async (req: AuthenticatedRequest, res: Response) => {
  const { factId } = req.params;
  const { newValue, comment } = req.body;

  try {
    if (newValue === undefined || newValue === null) {
      return res.status(400).json({ error: 'New value is required to override.' });
    }

    const fact = await prisma.parsedFact.findUnique({
      where: { id: factId },
      include: {
        statement: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!fact || !fact.statement) {
      return res.status(404).json({ error: 'Parsed fact not found.' });
    }

    const project = fact.statement.project;
    let updatedFact;

    await prisma.$transaction(async (tx) => {
      updatedFact = await tx.parsedFact.update({
        where: { id: factId },
        data: {
          isOverridden: true,
          overriddenValue: newValue,
        },
      });

      const existingMem = await tx.companyMemory.findFirst({
        where: {
          companyCin: project.companyId,
          category: 'CORRECTION',
          keyName: `override:${fact.factKey}`,
        },
      });

      if (existingMem) {
        await tx.companyMemory.update({
          where: { id: existingMem.id },
          data: {
            dataValue: JSON.stringify({ overrideValue: parseFloat(newValue) }),
            financialYear: project.financialYear,
          },
        });
      } else {
        await tx.companyMemory.create({
          data: {
            companyCin: project.companyId,
            category: 'CORRECTION',
            keyName: `override:${fact.factKey}`,
            dataValue: JSON.stringify({ overrideValue: parseFloat(newValue) }),
            financialYear: project.financialYear,
          },
        });
      }

      await tx.reviewAction.create({
        data: {
          projectId: fact.projectId,
          actionType: 'OVERRIDE',
          fieldName: fact.factKey,
          oldValue: fact.factValue,
          newValue: newValue,
          comment: comment || 'Manual reviewer override',
          userId: req.user?.id || 'SYSTEM',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          email: req.user?.email || 'ANONYMOUS',
          action: 'OVERRIDE',
          targetId: factId,
          targetType: 'ParsedFact',
          details: JSON.stringify({ field: fact.factKey, from: fact.factValue, to: newValue, comment }),
        },
      });
    });

    // Re-evaluate calculation validations
    const { reEvaluateProjectValidations } = require('../services/validationService');
    await reEvaluateProjectValidations(project.id);

    res.json({
      message: 'Fact overridden successfully',
      fact: updatedFact,
    });
  } catch (error) {
    console.error('Override Fact Error:', error);
    res.status(500).json({ error: 'Failed to override fact.' });
  }
};

export const createReviewSnapshot = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { stateData } = req.body;

  try {
    const lastVersion = await prisma.reviewVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const snapshot = await prisma.reviewVersion.create({
      data: {
        projectId,
        versionNumber: newVersionNumber,
        stateData: JSON.stringify(stateData || {}),
        createdById: req.user?.id || 'SYSTEM',
      },
    });

    res.status(201).json({
      ...snapshot,
      stateData: JSON.parse(snapshot.stateData),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review snapshot version.' });
  }
};

export const getReviewHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;

  try {
    const versions = await prisma.reviewVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    const parsedVersions = versions.map((v) => ({
      ...v,
      stateData: JSON.parse(v.stateData),
    }));

    res.json(parsedVersions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve review version history.' });
  }
};
