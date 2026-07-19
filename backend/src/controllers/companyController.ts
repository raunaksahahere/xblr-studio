import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';

export const createCompany = async (req: AuthenticatedRequest, res: Response) => {
  const { cin, name, registeredAddress, email, phone, sector, authorizedCapital, paidUpCapital } = req.body;
  const organizationId = req.user?.organizationId;

  try {
    if (!cin || !name) {
      return res.status(400).json({ error: 'Company CIN and Name are required.' });
    }

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization details missing.' });
    }

    // Check if CIN already exists (Strictly unique identifier)
    const existingCompany = await prisma.company.findUnique({
      where: { cin },
    });

    if (existingCompany) {
      return res.status(409).json({
        error: 'Company already exists.',
        company: existingCompany,
      });
    }

    // Create Company
    const company = await prisma.company.create({
      data: {
        cin,
        name,
        registeredOffice: registeredAddress,
        email,
        phone,
        organizationId,
        profiles: {
          create: {
            sector,
            authorizedCapital,
            paidUpCapital,
            directorNames: 'None listed',
          },
        },
      },
      include: {
        profiles: true,
      },
    });

    // Log Audit Event
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'COMPANY_CREATED',
        targetId: company.id,
        targetType: 'Company',
        details: JSON.stringify({ cin: company.cin, name: company.name }),
      },
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Create Company Error:', error);
    res.status(500).json({ error: 'Failed to create company.' });
  }
};

export const getCompanies = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = req.user?.organizationId;
  try {
    const companies = await prisma.company.findMany({
      where: { organizationId },
      include: {
        profiles: true,
        years: true,
      },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve companies.' });
  }
};

export const getCompanyByCin = async (req: AuthenticatedRequest, res: Response) => {
  const { cin } = req.params;
  const organizationId = req.user?.organizationId;

  try {
    const company = await prisma.company.findFirst({
      where: { cin, organizationId },
      include: {
        profiles: true,
        years: true,
        documents: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve company.' });
  }
};

export const getCompanyHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  try {
    const company = await prisma.company.findFirst({
      where: { id, organizationId },
      include: { years: true },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const projects = await prisma.project.findMany({
      where: { companyId: id, organizationId },
      include: {
        documents: true,
        xmlExports: true,
        pdfExports: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const memory = await prisma.companyMemory.findMany({
      where: { companyCin: company.cin },
    });

    res.json({
      financialYears: company.years,
      projects,
      companyMemory: memory,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve company history.' });
  }
};
