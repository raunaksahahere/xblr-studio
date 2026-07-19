import prisma from '../config/db';

export const getCompanyMemory = async (companyCin: string) => {
  return await prisma.companyMemory.findMany({
    where: { companyCin },
    orderBy: { updatedAt: 'desc' }
  });
};

export const createOrUpdateMemory = async (
  companyCin: string,
  category: string,
  keyName: string,
  dataValue: string,
  financialYear?: string,
  reviewerId?: string
) => {
  const existing = await prisma.companyMemory.findFirst({
    where: { companyCin, category, keyName }
  });

  if (existing) {
    return await prisma.companyMemory.update({
      where: { id: existing.id },
      data: {
        dataValue,
        financialYear,
        reviewerId,
        updatedAt: new Date()
      }
    });
  }

  return await prisma.companyMemory.create({
    data: {
      companyCin,
      category,
      keyName,
      dataValue,
      financialYear,
      reviewerId
    }
  });
};

export const checkMemoryConflicts = async (
  companyCin: string,
  newFacts: { key: string; value: string; source: string }[]
) => {
  const conflictsCreated = [];

  for (const fact of newFacts) {
    const stored = await prisma.companyMemory.findFirst({
      where: { companyCin, keyName: fact.key }
    });

    if (stored && stored.dataValue !== fact.value) {
      // Check if unresolved conflict already exists
      const existingConflict = await prisma.memoryConflict.findFirst({
        where: {
          companyCin,
          keyName: fact.key,
          status: 'UNRESOLVED'
        }
      });

      if (!existingConflict) {
        const conflict = await prisma.memoryConflict.create({
          data: {
            companyCin,
            category: stored.category,
            keyName: fact.key,
            detectedValue: fact.value,
            storedValue: stored.dataValue,
            evidenceSource: fact.source,
            status: 'UNRESOLVED'
          }
        });
        conflictsCreated.push(conflict);
      }
    }
  }

  return conflictsCreated;
};

export const getMemoryConflicts = async (companyCin: string) => {
  return await prisma.memoryConflict.findMany({
    where: { companyCin, status: 'UNRESOLVED' }
  });
};

export const resolveConflict = async (
  conflictId: string,
  resolution: 'UPDATE_MEMORY' | 'KEEP_MEMORY',
  reviewerId: string
) => {
  const conflict = await prisma.memoryConflict.findUnique({
    where: { id: conflictId }
  });

  if (!conflict) {
    throw new Error('Conflict not found');
  }

  if (resolution === 'UPDATE_MEMORY') {
    await createOrUpdateMemory(
      conflict.companyCin,
      conflict.category,
      conflict.keyName,
      conflict.detectedValue,
      undefined,
      reviewerId
    );
  }

  return await prisma.memoryConflict.update({
    where: { id: conflictId },
    data: { status: 'RESOLVED' }
  });
};
