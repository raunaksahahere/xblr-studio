import prisma from '../config/db';
import { XBRLInstance, XBRLContext, XBRLUnit, XBRLFact } from './xbrlModel';

export interface XBRLProjectScope {
  cin: string;
  financialYear: string;
  projectId: string;
}

export const processProjectXBRL = async (scope: XBRLProjectScope): Promise<string> => {
  const instance = new XBRLInstance();

  // 1. Fetch current parsed facts for the project
  const facts = await prisma.parsedFact.findMany({
    where: { projectId: scope.projectId },
  });

  // Strict Compliance Validation Check: Block generation if critical errors are active
  const criticalErrors = await prisma.validationError.findMany({
    where: {
      projectId: scope.projectId,
      severity: 'ERROR',
    },
  });

  if (criticalErrors.length > 0) {
    throw new Error(`MCA COMPLIANCE BLOCK: Filing cannot be generated. Critical validation errors must be resolved first: ${criticalErrors[0].message}`);
  }

  // Calculate year bounds
  const startYear = scope.financialYear.split('-')[0];
  const endYear = '20' + scope.financialYear.split('-')[1]; // handles "2024-25" -> "2025" or similar
  const formattedStart = `${startYear}-04-01`;
  const formattedEnd = `${endYear}-03-31`;

  // 2. Setup Unit engine
  const inrUnit = new XBRLUnit('INR', 'iso4217:INR');
  const pureUnit = new XBRLUnit('pure', 'xbrli:pure');
  instance.addUnit(inrUnit);
  instance.addUnit(pureUnit);

  // 3. Define Canonical Contexts
  // Instant context (balance sheet elements)
  const instantContext = new XBRLContext(
    `instant_${scope.financialYear.replace(/-/g, '_')}`,
    scope.cin,
    'instant',
    { instant: formattedEnd }
  );

  // Duration context (profit & loss / revenue elements)
  const durationContext = new XBRLContext(
    `duration_${scope.financialYear.replace(/-/g, '_')}`,
    scope.cin,
    'duration',
    { start: formattedStart, end: formattedEnd }
  );

  // Add contexts to instance (returns verified context reference IDs to reuse matching contexts)
  const instantRef = instance.addContext(instantContext);
  const durationRef = instance.addContext(durationContext);

  // 4. Map Facts into the Object Model
  for (const f of facts) {
    const finalValue = f.isOverridden && f.overriddenValue !== null ? f.overriddenValue : f.factValue;
    
    // Choose unit/decimals based on tag types
    let unitRef: string | undefined = 'INR';
    let decimals = '0';
    let contextRef = instantRef; // Default instant (Assets, Liabilities, Equity)

    if (f.factKey === 'Revenue' || f.factKey === 'NetProfit') {
      contextRef = durationRef;
    }

    if (f.unit === 'percentage' || f.unit === 'pure') {
      unitRef = 'pure';
      decimals = '4';
    }

    const factObj = new XBRLFact(
      `fact_${f.id.substring(0, 8)}`,
      f.xmlTag || `mca-indas:${f.factKey}`,
      finalValue,
      contextRef,
      decimals,
      unitRef
    );

    instance.addFact(factObj);
  }

  // 5. Serialize validated model
  return instance.serialize();
};
