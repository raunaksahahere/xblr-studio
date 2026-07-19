import prisma from '../config/db';
import { validateDimensionalAssignment } from './taxonomyRegistryService';

export interface MappingRecommendation {
  conceptId: string;
  qname: string;
  localName: string;
  confidence: number;
  reason: string;
  periodType: string;
  dataType: string;
}

// Generate candidates with strict compatibility scoring
export const generateMappingCandidates = async (factId: string, taxonomyReleaseVersion: string): Promise<MappingRecommendation[]> => {
  const fact = await prisma.parsedFact.findUnique({
    where: { id: factId },
  });

  if (!fact) {
    throw new Error('Fact not found');
  }

  const release = await prisma.taxonomyRelease.findUnique({
    where: { version: taxonomyReleaseVersion },
    include: {
      concepts: {
        include: { labels: true, references: true },
      },
    },
  });

  if (!release) {
    throw new Error(`Taxonomy Release Version ${taxonomyReleaseVersion} is not imported.`);
  }

  const recommendations: MappingRecommendation[] = [];

  for (const concept of release.concepts) {
    // Hard Compatibility Filter 1: Abstract concepts cannot carry values
    if (concept.isAbstract) continue;

    let score = 0;
    const reasons: string[] = [];

    // Match criteria A: Exact label match
    const lowercaseFactLabel = fact.factKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lowercaseConceptName = concept.localName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (lowercaseConceptName === lowercaseFactLabel) {
      score += 60;
      reasons.push('Exact concept name match');
    }

    const labelMatches = concept.labels.some(l => l.value.toLowerCase().replace(/[^a-z0-9]/g, '') === lowercaseFactLabel);
    if (labelMatches) {
      score += 30;
      reasons.push('Standard taxonomy label match');
    }

    // Match criteria B: Ontology alignment hints
    if (fact.internalConcept === 'REVENUE_FROM_OPERATIONS' && concept.qname === 'mca:RevenueFromOperations') {
      score += 80;
      reasons.push('Ontology mapping bridge suggestion');
    }
    if (fact.internalConcept === 'ASSETS' && concept.qname === 'mca:Assets') {
      score += 80;
      reasons.push('Ontology mapping bridge suggestion');
    }
    if (fact.internalConcept === 'EQUITY' && concept.qname === 'mca:Equity') {
      score += 80;
      reasons.push('Ontology mapping bridge suggestion');
    }
    if (fact.internalConcept === 'LIABILITIES' && concept.qname === 'mca:Liabilities') {
      score += 80;
      reasons.push('Ontology mapping bridge suggestion');
    }
    if (fact.internalConcept === 'PROFIT_AFTER_TAX' && concept.qname === 'mca:ProfitForThePeriod') {
      score += 80;
      reasons.push('Ontology mapping bridge suggestion');
    }

    // Match criteria C: Period Type compatibility
    const factPeriodType = fact.periodType || 'instant';
    if (concept.periodType === factPeriodType) {
      score += 15;
    } else {
      // Degrade score severely if there is a period mismatch
      score -= 50;
      reasons.push('WARNING: PeriodType mismatch (Instant vs Duration)');
    }

    if (score > 20) {
      recommendations.push({
        conceptId: concept.id,
        qname: concept.qname,
        localName: concept.localName,
        confidence: Math.min(score, 100),
        reason: reasons.join(', '),
        periodType: concept.periodType,
        dataType: concept.dataType,
      });
    }
  }

  // Sort by highest confidence descending
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

// Validate a specific mapping before preparer approval
export const validateMappingCompatibility = async (factId: string, conceptId: string, dimensionalAxis?: string, dimensionalMember?: string) => {
  const fact = await prisma.parsedFact.findUnique({
    where: { id: factId },
  });

  const concept = await prisma.taxonomyConcept.findUnique({
    where: { id: conceptId },
  });

  if (!fact || !concept) {
    throw new Error('Fact or concept not found.');
  }

  const errors: string[] = [];

  // Rule 1: Abstract concepts check
  if (concept.isAbstract) {
    errors.push('ABSTRACT_CONCEPT_SELECTED: Abstract taxonomy concepts cannot carry reported facts.');
  }

  // Rule 2: Period Type check
  const factPeriodType = fact.periodType || 'instant';
  if (concept.periodType !== factPeriodType) {
    errors.push(`PERIOD_TYPE_MISMATCH: Fact period type is "${factPeriodType}" but selected taxonomy concept requires "${concept.periodType}".`);
  }

  // Rule 3: Dimension axis member check
  if (dimensionalAxis && dimensionalMember) {
    const isValid = validateDimensionalAssignment(dimensionalAxis, dimensionalMember);
    if (!isValid) {
      errors.push(`INVALID_DIMENSION: Selected member "${dimensionalMember}" is invalid for axis "${dimensionalAxis}".`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Run automated candidates mapping for project
export const autoResolveProjectMappings = async (projectId: string, taxonomyReleaseVersion: string) => {
  console.log(`[MappingEngine] Auto-resolving mappings for project: ${projectId}`);

  const facts = await prisma.parsedFact.findMany({
    where: { projectId },
  });

  for (const fact of facts) {
    // Generate candidates
    let ver = taxonomyReleaseVersion;
    if (ver === '2024') {
      ver = 'MCA_IND_AS_2024';
    }
    const candidates = await generateMappingCandidates(fact.id, ver);
    if (candidates.length > 0) {
      const topCandidate = candidates[0];

      // Save mapping
      await prisma.taxonomyMapping.upsert({
        where: { id: `auto-${fact.id}` },
        update: {
          elementId: topCandidate.conceptId,
          elementName: topCandidate.qname,
          taxonomyType: topCandidate.dataType,
          confidence: topCandidate.confidence,
        },
        create: {
          id: `auto-${fact.id}`,
          parsedFactId: fact.id,
          elementId: topCandidate.conceptId,
          elementName: topCandidate.qname,
          taxonomyType: topCandidate.dataType,
          confidence: topCandidate.confidence,
        },
      });

      // Update project stage
      await prisma.project.update({
        where: { id: projectId },
        data: { currentStage: 'MAPPING_IN_PROGRESS' },
      });
    }
  }
};
