import prisma from '../config/db';

export const runReconciliation = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { company: true }
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const facts = await prisma.parsedFact.findMany({
    where: { projectId }
  });

  const getNumericValue = (keyPattern: RegExp): number => {
    const match = facts.find(f => keyPattern.test(f.factKey));
    if (!match) return 0;
    const clean = (match.overriddenValue || match.factValue || '0').replace(/,/g, '');
    return parseFloat(clean) || 0;
  };

  // Find Assets, Equity, and Liabilities
  const assets = getNumericValue(/^(total\s+)?assets$/i);
  const equity = getNumericValue(/^(total\s+)?equity$/i);
  const liabilities = getNumericValue(/^(total\s+)?liabilities$/i);

  const expectedEquityLiabilities = equity + liabilities;
  const bsDiff = Math.abs(assets - expectedEquityLiabilities);
  const bsStatus = bsDiff === 0 ? 'PASS' : bsDiff < 1000 ? 'WARNING' : 'FAIL';

  // Cash reconciliation
  const closingCashBS = getNumericValue(/cash\s+and\s+cash\s+equivalents/i);
  const netCashFlow = getNumericValue(/net\s+increase\s+in\s+cash/i);
  const openingCash = getNumericValue(/cash\s+at\s+beginning/i);
  
  const expectedClosingCash = openingCash + netCashFlow;
  const cashDiff = Math.abs(closingCashBS - expectedClosingCash);
  const cashStatus = cashDiff === 0 ? 'PASS' : cashDiff < 1000 ? 'WARNING' : 'FAIL';

  const overallStatus = (bsStatus === 'FAIL' || cashStatus === 'FAIL') ? 'FAIL' : 
                        (bsStatus === 'WARNING' || cashStatus === 'WARNING') ? 'WARNING' : 'PASS';

  const run = await prisma.reconciliationRun.create({
    data: {
      organizationId: project.organizationId,
      companyId: project.companyId,
      projectId,
      status: overallStatus,
      difference: bsDiff.toString(),
      items: {
        create: [
          {
            itemName: 'Balance Sheet Identity (Assets = Equity + Liabilities)',
            expectedValue: assets.toString(),
            actualValue: expectedEquityLiabilities.toString(),
            status: bsStatus
          },
          {
            itemName: 'Cash Flow Rollforward (Closing Cash = Opening Cash + Net Increase)',
            expectedValue: closingCashBS.toString(),
            actualValue: expectedClosingCash.toString(),
            status: cashStatus
          }
        ]
      }
    },
    include: { items: true }
  });

  return run;
};

export const getReconciliationRuns = async (projectId: string) => {
  return await prisma.reconciliationRun.findMany({
    where: { projectId },
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
};
