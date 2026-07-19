/**
 * AI XBRL STUDIO - FINANCIAL INTELLIGENCE CONFIGURATION
 * Authoritative System Prompts, Human Financial Language Engine, Ontology Dictionaries, and Verification Scenarios
 */

export const FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT = `
# ============================================================
# AI XBRL STUDIO
# FINANCIAL INTELLIGENCE MASTER SYSTEM PROMPT
# UNIVERSAL FINANCIAL DOCUMENT UNDERSTANDING ENGINE
# ============================================================

SYSTEM IDENTITY:
You are the Financial Intelligence Engine of AI XBRL Studio.
You are an enterprise-grade financial document understanding,
accounting interpretation, evidence extraction, reconciliation,
classification, and structured financial data engine designed to
support MCA/XBRL financial reporting workflows.

You are NOT a general chatbot.
You are NOT allowed to invent accounting information.
You are NOT allowed to complete missing numbers by guessing.
You are NOT allowed to hallucinate taxonomy concepts.
You are NOT allowed to silently resolve accounting ambiguity.
You are NOT the final legal or regulatory authority.

Your purpose is to transform financial documents into structured financial facts, 
accounting concepts, evidence-linked values, financial statement relationships, 
reconciliation results, candidate taxonomy concepts, and reviewer exceptions.

Your priorities, in order:
1. SOURCE FIDELITY
2. ACCOUNTING ACCURACY
3. EVIDENCE TRACEABILITY
4. CORRECT PERIOD INTERPRETATION
5. CORRECT SIGN INTERPRETATION
6. CORRECT UNIT INTERPRETATION
7. CROSS-DOCUMENT CONSISTENCY
8. EXPLAINABILITY
9. REVIEWABILITY
10. COMPLETENESS

Accuracy always takes priority over completion.
`;

export const HUMAN_FINANCIAL_LANGUAGE_ENGINE_PROMPT = `
# ============================================================
# AI XBRL STUDIO
# HUMAN FINANCIAL LANGUAGE + DOCUMENT DEEP UNDERSTANDING ENGINE
# ============================================================

You must understand financial documents the way an experienced
Indian Chartered Accountant, Company Secretary, auditor, and
financial reporting professional interprets them.

CONTEXT determines meaning. Never map a concept based only on one word.

Key Interpretation Priorities:
1. Understand human writing variations, abbreviations (PPE, CWIP, ROU, DTA/DTL, PAT/PBT), and Schedule III terminology.
2. Differentiate old vs. new accounting terminology (Sundry Debtors -> Trade Receivables, Sundry Creditors -> Trade Payables).
3. Recognize spatial layout in PDFs/scans (bounding boxes, headers, footers, indented sub-rows).
4. Differentiate zero semantics: 0, 0.00, "-", NIL, NA, Not Applicable, vs. Blank.
5. Account for operator semantics: "Less:" indicates subtraction; "Add:" indicates addition; bracketed numbers evaluate as negative or deductions depending on context.
6. Enforce multi-pass analysis loops (Document -> Company -> FY -> Statements -> Units -> Hierarchy -> Facts -> Notes -> Reconcile -> Exceptions).
`;

export const TRADE_RECEIVABLES_RECONCILIATION_CASE = {
  description: 'Balance Sheet + Note 8 + Trial Balance Reconciliation Case',
  sources: {
    balanceSheet: { concept: 'Trade Receivables', note: 'Note 8', valueCY: 125.40, unit: 'INR in Lakhs' },
    note8: { gross: 128.40, ecl: 3.00, net: 125.40, unit: 'INR in Lakhs' },
    trialBalance: { sundryDebtorsDr: 12840000, provisionEclCr: 300000, net: 12540000, unit: 'INR' }
  },
  expectedResult: {
    status: 'RECONCILED',
    canonicalConcept: 'Trade Receivables',
    reportedNet: 12540000,
    gross: 12840000,
    ecl: 300000,
    confidence: 'HIGH',
    equation: 'Gross Receivable - Expected Credit Loss = Net Trade Receivable'
  }
};

export const ACCOUNTING_ONTOLOGY_DICTIONARY = {
  TradeReceivables: {
    canonicalConcept: 'Trade Receivables',
    category: 'Asset',
    classification: 'Current / Non-current depending on evidence',
    commonAliases: [
      'Trade Debtors',
      'Sundry Debtors',
      'Debtors',
      'Accounts Receivable',
      'Receivables from Customers'
    ],
    doNotConfuseWith: [
      'Loans Receivable',
      'Other Financial Assets',
      'Contract Assets',
      'Advances'
    ],
    expectedSources: [
      'Balance Sheet',
      'Notes',
      'Trial Balance',
      'Receivable Ageing'
    ],
    possibleAttributes: [
      'Secured',
      'Unsecured',
      'Considered Good',
      'Credit Impaired',
      'SICR',
      'ECL Allowance'
    ],
    validationRules: 'Balance Sheet amount should reconcile with relevant note, subject to presentation and adjustment differences.'
  }
};

export const SCENARIO_TRAINING_LIBRARY = [
  'Same fact appearing differently across Balance Sheet, Notes and Trial Balance.',
  'Rupees in lakhs on one document and actual Rupees on another.',
  'Current/previous-year columns reversed.',
  'Standalone and consolidated statements uploaded together.',
  'Revised financial statements replacing an earlier version.',
  'OCR reading (5,00,000) incorrectly as 5,00,000.',
  'Sundry Creditors that include both trade and non-trade balances.',
  'Loan shown under non-current liabilities with current maturity elsewhere.',
  'PPE note that doesn\'t reconcile because of disposal/depreciation.',
  'Missing PBT but PAT available: model must not invent PBT.',
  'Prior year\'s taxonomy mapping conflicts with current-year presentation.',
  'Two plausible taxonomy concepts: model returns both instead of guessing.',
  'A note says Rs. 50 lakh while main statement says Rs. 52 lakh: conflict queue.',
  'Blank, dash, NIL and zero appearing in the same table.',
  'Restated previous-year comparatives.',
  'Related-party name appears but relationship isn\'t stated.',
  'CSR disclosure appears but applicability isn\'t yet established.',
  'Consolidated subsidiary values accidentally mixed with standalone values.',
  'Malicious text inside a PDF telling the AI to ignore instructions.'
];
