import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { importOfficialTaxonomyRelease, searchTaxonomyConcepts } from '../services/taxonomyRegistryService';
import { generateMappingCandidates, validateMappingCompatibility, autoResolveProjectMappings } from '../services/taxonomyMappingService';
import crypto from 'crypto';

// GET /api/v1/taxonomies
export const getTaxonomyReleases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const releases = await prisma.taxonomyRelease.findMany();
    res.json(releases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve taxonomy releases.' });
  }
};

// POST /api/v1/taxonomies/import
export const importTaxonomy = async (req: AuthenticatedRequest, res: Response) => {
  const { version } = req.body;

  try {
    if (!version) {
      return res.status(400).json({ error: 'Version string is required.' });
    }

    const release = await importOfficialTaxonomyRelease(version);
    res.status(201).json(release);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import taxonomy release.' });
  }
};

// GET /api/v1/projects/:id/taxonomy-mappings
export const getProjectTaxonomyMappings = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const facts = await prisma.parsedFact.findMany({
      where: { projectId: id },
      include: {
        mappings: true,
      },
    });

    const results = [];
    for (const fact of facts) {
      const currentMapping = fact.mappings[0] || null;
      
      // Auto-fetch candidates based on current project taxonomy version
      const project = await prisma.project.findUnique({ where: { id } });
      let version = project?.taxonomyVersion || 'MCA_IND_AS_2024';
      if (version === '2024') {
        version = 'MCA_IND_AS_2024';
      }

      const candidates = await generateMappingCandidates(fact.id, version);

      results.push({
        fact,
        currentMapping,
        candidates,
      });
    }

    res.json(results);
  } catch (err: any) {
    console.error('[TaxonomyController] Error retrieving mappings:', err);
    res.status(500).json({ error: 'Failed to retrieve project mappings.', message: err.message });
  }
};

// PATCH /api/v1/taxonomy-mappings/:id
export const updateFactTaxonomyMapping = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // factId
  const { conceptId, axisQname, memberQname } = req.body;

  try {
    if (!conceptId) {
      return res.status(400).json({ error: 'conceptId is required.' });
    }

    const fact = await prisma.parsedFact.findUnique({
      where: { id },
    });

    if (!fact) {
      return res.status(404).json({ error: 'Fact not found.' });
    }

    const concept = await prisma.taxonomyConcept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      return res.status(404).json({ error: 'Selected concept not found in registry.' });
    }

    // Run structural compatibility checks
    const check = await validateMappingCompatibility(id, conceptId, axisQname, memberQname);
    if (!check.isValid) {
      return res.status(422).json({ error: 'COMPATIBILITY_FAILURE', messages: check.errors });
    }

    // Upsert mapping entry
    const mapping = await prisma.taxonomyMapping.upsert({
      where: { id: `manual-${fact.id}` },
      update: {
        elementId: conceptId,
        elementName: concept.qname,
        taxonomyType: concept.dataType,
        confidence: 100.0,
        mappedById: req.user?.id,
      },
      create: {
        id: `manual-${fact.id}`,
        parsedFactId: fact.id,
        elementId: conceptId,
        elementName: concept.qname,
        taxonomyType: concept.dataType,
        confidence: 100.0,
        mappedById: req.user?.id,
      },
    });

    // Save action to Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'MAPPING_APPROVED',
        targetId: fact.id,
        targetType: 'ParsedFact',
        details: JSON.stringify({ elementName: concept.qname, axisQname, memberQname }),
      },
    });

    res.json(mapping);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update taxonomy mapping.' });
  }
};

// POST /api/v1/projects/:id/taxonomy-datasets/build
export const buildTaxonomyDataset = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        parsedFacts: {
          include: { mappings: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Trigger auto-resolve for any unmapped facts to build complete set
    await autoResolveProjectMappings(id, project.taxonomyVersion);

    const previousDatasets = await prisma.taxonomyDataset.findMany({
      where: { projectId: id },
    });
    const nextVer = previousDatasets.length + 1;

    // Create a fingerprint/hash of the mapped concepts values
    const dataString = JSON.stringify(project.parsedFacts.map(f => `${f.factKey}:${f.mappings[0]?.elementName || 'UNMAPPED'}`));
    const mappingSnapshotHash = crypto.createHash('sha256').update(dataString).digest('hex');

    const dataset = await prisma.taxonomyDataset.create({
      data: {
        projectId: id,
        versionNumber: nextVer,
        status: 'DRAFT',
        createdBy: req.user?.email || 'SYSTEM',
        mappingSnapshotHash,
        exceptionsCount: project.parsedFacts.filter(f => f.mappings.length === 0).length,
      },
    });

    res.status(201).json(dataset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile taxonomy dataset snapshot.' });
  }
};

// POST /api/v1/taxonomy-datasets/:id/approve
export const approveTaxonomyDataset = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const dataset = await prisma.taxonomyDataset.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user?.email || 'SYSTEM',
      },
    });

    res.json(dataset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve taxonomy dataset release.' });
  }
};

// GET /api/v1/projects/:id/taxonomy-datasets
export const getTaxonomyDatasets = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const datasets = await prisma.taxonomyDataset.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: 'desc' },
    });
    res.json(datasets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve datasets.' });
  }
};
