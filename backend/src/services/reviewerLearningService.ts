import prisma from '../config/db';

export const logReviewerDecision = async (
  organizationId: string,
  projectId: string,
  companyId: string,
  financialYearId: string,
  reviewerId: string,
  decisionType: string,
  entityType: string,
  entityId: string,
  oldValueJson?: string,
  newValueJson?: string,
  reason?: string
) => {
  return await prisma.reviewDecision.create({
    data: {
      organizationId,
      projectId,
      companyId,
      financialYearId,
      reviewerId,
      decisionType,
      entityType,
      entityId,
      oldValueJson,
      newValueJson,
      reason
    }
  });
};

export const getMappingPrecedent = async (
  companyId: string,
  factKey: string
) => {
  // Query previous approved decisions for this fact key on this company
  const decisions = await prisma.reviewDecision.findMany({
    where: {
      companyId,
      entityType: 'ParsedFact',
      decisionType: { in: ['APPROVE', 'OVERRIDE'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const dec of decisions) {
    if (dec.newValueJson) {
      try {
        const val = JSON.parse(dec.newValueJson);
        if (val.factKey === factKey && val.elementName) {
          return {
            elementName: val.elementName,
            taxonomyType: val.taxonomyType || 'IND_AS',
            reason: dec.reason || 'Reused from previous approved filing precedent.',
            reviewerId: dec.reviewerId,
            createdAt: dec.createdAt
          };
        }
      } catch (e) {
        // Not JSON or missing fields, continue
      }
    }
  }

  return null;
};

export const calculatePrecedentScore = async (
  companyId: string,
  factKey: string,
  suggestedElement: string
) => {
  const precedent = await getMappingPrecedent(companyId, factKey);
  if (precedent && precedent.elementName === suggestedElement) {
    return {
      score: 98.4,
      basis: 'Historical Precedent',
      details: `Mapping consistent with approved decision on ${precedent.createdAt.toLocaleDateString()}`
    };
  }

  return {
    score: 75.0,
    basis: 'AI Recommendation',
    details: 'Semantic taxonomy matching suggestion.'
  };
};
