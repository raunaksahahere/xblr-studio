import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  const { companyId, financialYear, reportingStandard = 'IND_AS', scheduleIiiDivision = 'DIVISION_II', taxonomyVersion = '2024' } = req.body;
  const organizationId = req.user?.organizationId;

  try {
    if (!companyId || !financialYear) {
      return res.status(400).json({ error: 'Company ID and Financial Year are required.' });
    }

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization identifier missing.' });
    }

    // Check if project already exists for this company + FY + Org
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId,
        companyId,
        financialYear,
      },
    });

    if (existingProject) {
      return res.status(409).json({
        error: 'A project for this company and financial year already exists.',
        project: existingProject,
      });
    }

    // Ensure FinancialYear exists or create it
    const fyRecord = await prisma.financialYear.upsert({
      where: {
        companyId_label: {
          companyId,
          label: financialYear,
        },
      },
      update: {},
      create: {
        companyId,
        organizationId,
        label: financialYear,
        startDate: new Date(`${financialYear.split('-')[0]}-04-01`),
        endDate: new Date(`${financialYear.split('-')[1] || financialYear}-03-31`),
        reportingStandard,
        scheduleIiiDivision,
        taxonomyVersion,
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId,
        companyId,
        financialYear,
        financialYearId: fyRecord.id,
        status: 'IN_PROGRESS',
        reportingStandard,
        scheduleIiiDivision,
        taxonomyVersion,
        currentStage: 'DOCUMENT_COLLECTION',
        createdById: req.user?.id || 'SYSTEM',
      },
      include: {
        company: true,
      },
    });

    // Audit Log (Stringify details for SQLite)
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'PROJECT_CREATED',
        targetId: project.id,
        targetType: 'Project',
        details: JSON.stringify({ companyId, financialYear }),
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ error: 'Failed to create filing project.' });
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = req.user?.organizationId;

  try {
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
      },
      include: {
        company: true,
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            profiles: true,
          },
        },
        documents: {
          include: {
            versions: true,
          },
        },
        financialStatements: {
          include: {
            parsedFacts: {
              include: {
                mappings: true,
              },
            },
          },
        },
        validationErrors: true,
        reviewActions: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        xmlExports: true,
        pdfExports: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Filing project not found.' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get Project Details Error:', error);
    res.status(500).json({ error: 'Failed to retrieve project details.' });
  }
};

export const updateProjectStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, currentStage } = req.body;

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { 
        status: status !== undefined ? status : undefined,
        currentStage: currentStage !== undefined ? currentStage : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'PROJECT_STATUS_UPDATED',
        targetId: id,
        targetType: 'Project',
        details: JSON.stringify({ status, currentStage }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project status.' });
  }
};
