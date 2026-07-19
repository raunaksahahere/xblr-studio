import prisma from '../config/db';

export const getOrCreateStageRun = async (projectId: string, stageName: string, total: number = 100) => {
  const existing = await prisma.pipelineStageRun.findFirst({
    where: { projectId, stageName }
  });

  if (existing) {
    return existing;
  }

  return await prisma.pipelineStageRun.create({
    data: {
      projectId,
      stageName,
      status: 'NOT_STARTED',
      progressCurrent: 0,
      progressTotal: total,
    }
  });
};

export const updateStageProgress = async (projectId: string, stageName: string, current: number, status: string = 'RUNNING') => {
  const stage = await getOrCreateStageRun(projectId, stageName);
  
  return await prisma.pipelineStageRun.update({
    where: { id: stage.id },
    data: {
      progressCurrent: current,
      status,
    }
  });
};

export const getProjectPipelineStages = async (projectId: string) => {
  const stages = await prisma.pipelineStageRun.findMany({
    where: { projectId }
  });

  // Default fallback list to ensure UI has keys
  const defaultStages = [
    { stageName: 'Ingestion', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'Parsing', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'Extraction', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'Mapping', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'Validation', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'XbrlGeneration', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'PdfGeneration', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
    { stageName: 'PackageBuilding', status: 'NOT_STARTED', progressCurrent: 0, progressTotal: 100 },
  ];

  const merged = defaultStages.map(def => {
    const matched = stages.find(s => s.stageName === def.stageName);
    return matched || def;
  });

  return merged;
};
