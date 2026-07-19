import prisma from '../config/db';

export const importOfficialTaxonomyRelease = async (versionName: string) => {
  console.log(`[TaxonomyRegistry] Importing taxonomy release package: ${versionName}`);

  // Create release entry
  const release = await prisma.taxonomyRelease.upsert({
    where: { version: versionName },
    update: { status: 'ACTIVE' },
    create: { version: versionName, status: 'ACTIVE' },
  });

  // Core MCA Ind AS 2024 concepts seed template
  const seedConcepts = [
    {
      qname: 'mca:Assets',
      localName: 'Assets',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Assets', 'Total Assets'],
      reference: 'Schedule III - Balance Sheet - Part I - Assets',
    },
    {
      qname: 'mca:Equity',
      localName: 'Equity',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Equity', 'Total Shareholder Equity'],
      reference: 'Schedule III - Balance Sheet - Part I - Equity',
    },
    {
      qname: 'mca:Liabilities',
      localName: 'Liabilities',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Liabilities', 'Total Liabilities'],
      reference: 'Schedule III - Balance Sheet - Part I - Liabilities',
    },
    {
      qname: 'mca:RevenueFromOperations',
      localName: 'RevenueFromOperations',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'duration',
      isAbstract: false,
      labels: ['Revenue from Operations', 'Sales', 'Turnover'],
      reference: 'Schedule III - P&L - Part II - Revenue',
    },
    {
      qname: 'mca:ProfitForThePeriod',
      localName: 'ProfitForThePeriod',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'duration',
      isAbstract: false,
      labels: ['Profit for Period', 'Net Profit after Tax', 'PAT'],
      reference: 'Schedule III - P&L - Part II - Profit',
    },
    {
      qname: 'mca:PropertyPlantAndEquipment',
      localName: 'PropertyPlantAndEquipment',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Property, Plant and Equipment', 'PPE Gross Block', 'Fixed Assets'],
      reference: 'Schedule III - Balance Sheet - Non-Current Assets - PPE',
    },
    {
      qname: 'mca:CashAndCashEquivalents',
      localName: 'CashAndCashEquivalents',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Cash and cash equivalents', 'Bank balances', 'Cash at Hand'],
      reference: 'Schedule III - Balance Sheet - Current Assets - Cash',
    },
    {
      qname: 'mca:ShareCapital',
      localName: 'ShareCapital',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Share Capital', 'Issued Share Capital', 'Equity share capital'],
      reference: 'Schedule III - Balance Sheet - Equity - Share Capital',
    },
    {
      qname: 'mca:TradeReceivables',
      localName: 'TradeReceivables',
      dataType: 'xbrli:monetaryItemType',
      periodType: 'instant',
      isAbstract: false,
      labels: ['Trade Receivables', 'Sundry Debtors', 'Trade Debtors'],
      reference: 'Schedule III - Balance Sheet - Current Assets - Trade Receivables',
    },
    {
      qname: 'mca:AbstractStatementOfFinancialPosition',
      localName: 'AbstractStatementOfFinancialPosition',
      dataType: 'xbrli:stringItemType',
      periodType: 'instant',
      isAbstract: true,
      labels: ['Statement of Financial Position [Abstract]', 'Balance Sheet presentation group'],
      reference: 'Schedule III - Balance Sheet',
    }
  ];

  for (const item of seedConcepts) {
    // 1. Create Concept
    const concept = await prisma.taxonomyConcept.upsert({
      where: { qname: item.qname },
      update: {
        localName: item.localName,
        dataType: item.dataType,
        periodType: item.periodType,
        isAbstract: item.isAbstract,
      },
      create: {
        releaseId: release.id,
        qname: item.qname,
        localName: item.localName,
        dataType: item.dataType,
        periodType: item.periodType,
        isAbstract: item.isAbstract,
      },
    });

    // 2. Create Labels
    await prisma.taxonomyLabel.deleteMany({ where: { conceptId: concept.id } });
    for (const labelVal of item.labels) {
      await prisma.taxonomyLabel.create({
        data: {
          conceptId: concept.id,
          lang: 'en',
          labelRole: 'standard',
          value: labelVal,
        },
      });
    }

    // 3. Create Reference
    await prisma.taxonomyReference.deleteMany({ where: { conceptId: concept.id } });
    await prisma.taxonomyReference.create({
      data: {
        conceptId: concept.id,
        reference: item.reference,
      },
    });
  }

  // Seed presentation relations parent-child
  const parentConcept = await prisma.taxonomyConcept.findUnique({
    where: { qname: 'mca:AbstractStatementOfFinancialPosition' },
  });

  if (parentConcept) {
    const childConcepts = await prisma.taxonomyConcept.findMany({
      where: { qname: { in: ['mca:Assets', 'mca:Equity', 'mca:Liabilities'] } },
    });

    for (const child of childConcepts) {
      await prisma.taxonomyRelationship.create({
        data: {
          relationshipType: 'PRESENTATION',
          sourceConceptId: parentConcept.id,
          targetConceptId: child.id,
        },
      });
    }
  }

  return release;
};

// Search concepts index (labels, qname, Schedule III reference)
export const searchTaxonomyConcepts = async (releaseVersion: string, query: string) => {
  const release = await prisma.taxonomyRelease.findUnique({
    where: { version: releaseVersion },
  });

  if (!release) return [];

  const normalizedQuery = query.toLowerCase().trim();

  const concepts = await prisma.taxonomyConcept.findMany({
    where: {
      releaseId: release.id,
    },
    include: {
      labels: true,
      references: true,
    },
  });

  // Filter based on matching QName, localName, labels, or reference
  return concepts.filter((c) => {
    if (c.qname.toLowerCase().includes(normalizedQuery)) return true;
    if (c.localName.toLowerCase().includes(normalizedQuery)) return true;
    if (c.labels.some((l) => l.value.toLowerCase().includes(normalizedQuery))) return true;
    if (c.references.some((r) => r.reference.toLowerCase().includes(normalizedQuery))) return true;
    return false;
  });
};

// Validate dimensional compatibility axis-member
export const validateDimensionalAssignment = (axisQname: string, memberQname: string): boolean => {
  console.log(`[DimensionEngine] Checking if member: ${memberQname} is valid for axis: ${axisQname}`);
  
  // MCA Ind AS 2024 dimensional axis definitions mapping:
  const validDimensions: Record<string, string[]> = {
    'mca:ClassesOfShareCapitalAxis': [
      'mca:EquitySharesMember',
      'mca:PreferenceSharesMember'
    ],
    'mca:ClassesOfPropertyPlantAndEquipmentAxis': [
      'mca:LandMember',
      'mca:BuildingsMember',
      'mca:PlantAndMachineryMember'
    ]
  };

  if (!validDimensions[axisQname]) {
    return false; // Axis not registered or invalid
  }

  return validDimensions[axisQname].includes(memberQname);
};
