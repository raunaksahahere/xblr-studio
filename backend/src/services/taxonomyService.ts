export interface TaxonomyMappingResult {
  conceptName: string;
  mcaElement: string;
  taxonomyName: string;
  confidence: number;
  documentation: string;
}

const TAXONOMY_DB: Record<string, Omit<TaxonomyMappingResult, 'conceptName'>> = {
  Assets: {
    mcaElement: 'mca-indas:Assets',
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.95,
    documentation: 'Total economic resources owned or controlled by the company as a result of past events.',
  },
  Equity: {
    mcaElement: 'mca-indas:Equity',
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.95,
    documentation: 'Residual interest in the assets of the enterprise after deducting all its liabilities.',
  },
  Liabilities: {
    mcaElement: 'mca-indas:Liabilities',
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.95,
    documentation: 'Present obligations of the enterprise arising from past events, the settlement of which is expected to result in outflow of resources.',
  },
  Revenue: {
    mcaElement: 'mca-indas:RevenueFromOperations',
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.92,
    documentation: 'Gross inflow of economic benefits arising in the course of ordinary activities of the company.',
  },
  NetProfit: {
    mcaElement: 'mca-indas:ProfitLossForPeriod',
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.94,
    documentation: 'Net profit or loss for the reporting period after tax expenses and extraordinary items.',
  },
};

export const getTaxonomyMapping = (conceptKey: string): TaxonomyMappingResult => {
  const matched = TAXONOMY_DB[conceptKey];
  if (matched) {
    return {
      conceptName: conceptKey,
      ...matched,
    };
  }

  // Generic fallback
  return {
    conceptName: conceptKey,
    mcaElement: `mca-indas:${conceptKey}`,
    taxonomyName: 'MCA IndAS Taxonomy 2024',
    confidence: 0.70,
    documentation: `Auto-generated IndAS taxonomy classification match for ${conceptKey}.`,
  };
};
