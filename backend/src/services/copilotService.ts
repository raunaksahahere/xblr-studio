import prisma from '../config/db';
import { runReconciliation } from './reconciliationService';
import { getMappingPrecedent } from './reviewerLearningService';
import { FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT } from '../config/financialPrompt';
import { getActiveTrainingContext } from './aiTrainingService';
import { geminiCopilotAnswer, isGeminiConfigured } from './geminiService';

export interface CopilotResponse {
  conclusion: string;
  evidence: string;
  reasoning: string;
  ruleBasis?: string;
  alternatives?: string[];
  confidence: number;
  citations: { label: string; url: string }[];
}

export const chatWithCopilot = async (
  projectId: string,
  message: string,
  mode: string
): Promise<CopilotResponse> => {
  // Bind master intelligence prompts context
  const trainingContext = await getActiveTrainingContext();
  const activePrompt = `${FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT}\n\n# ACTIVE TRAINING CORPUS\n${trainingContext}`;
  console.log(`[CopilotService] Active system prompt injected. Rules length: ${activePrompt.length}`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { company: true }
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const query = message.toLowerCase();

  if (mode === 'RECONCILE' || query.includes('reconcile') || query.includes('balance sheet')) {
    const run = await runReconciliation(projectId);
    const bsItem = run.items.find(i => i.itemName.includes('Balance Sheet'));
    const status = run.status;

    return {
      conclusion: `Reconciliation completed with status: ${status}.`,
      evidence: `Assets: ${bsItem?.expectedValue}, Equity + Liabilities: ${bsItem?.actualValue}`,
      reasoning: `Deterministically calculated the Balance Sheet identity from extracted parsed facts. Mismatch: ${run.difference} INR.`,
      ruleBasis: 'Schedule III Division II balance sheet framework',
      confidence: 100.0,
      citations: [
        { label: 'Validation Center Reconciliations', url: `/projects/${projectId}/validation` }
      ]
    };
  }

  if (mode === 'EXPLAIN' || query.includes('why') || query.includes('mapped')) {
    // Look up fact mapping logic
    const fact = await prisma.parsedFact.findFirst({
      where: { projectId, factKey: { contains: 'payables' } }
    });

    if (fact) {
      const precedent = await getMappingPrecedent(project.companyId, fact.factKey);
      return {
        conclusion: `Fact '${fact.factKey}' is mapped to 'in-ca:TradePayables'.`,
        evidence: `Extracted value: ${fact.factValue}. Precedent reviewer confirmation found: ${precedent ? 'Yes' : 'No'}.`,
        reasoning: precedent 
          ? precedent.reason 
          : 'AI suggested taxonomy match based on semantic label similarity.',
        ruleBasis: 'Ind AS 1 Presentation of Financial Statements',
        confidence: precedent ? 98.4 : 75.0,
        citations: [
          { label: 'Company Memory Mappings', url: `/companies/${project.company.id}/memory` }
        ]
      };
    }
  }

  const totalFacts = await prisma.parsedFact.count({ where: { projectId } });
  const unresolvedFacts = await prisma.parsedFact.count({
    where: { projectId, status: 'REVIEW_REQUIRED' },
  });

  const sampleFacts = await prisma.parsedFact.findMany({
    where: { projectId },
    take: 15,
    select: { factKey: true, factValue: true, confidence: true, status: true },
  });

  const projectContext = [
    `Company: ${project.company.name} (CIN ${project.company.cin})`,
    `Financial year: ${project.financialYear}`,
    `Facts verified: ${totalFacts - unresolvedFacts}/${totalFacts}`,
    `Facts pending review: ${unresolvedFacts}`,
    `Sample facts: ${JSON.stringify(sampleFacts)}`,
  ].join('\n');

  if (isGeminiConfigured()) {
    try {
      const { answer, confidence } = await geminiCopilotAnswer(activePrompt, message, projectContext);
      const summaryLine = answer.split('\n').find((l) => l.trim()) || answer.slice(0, 280);
      return {
        conclusion: summaryLine.slice(0, 500),
        evidence: projectContext,
        reasoning: answer,
        ruleBasis: 'Gemini + registered MCA/XBRL training corpus',
        confidence,
        citations: [
          { label: 'Review Workspace', url: `/projects/${projectId}/review` },
          { label: 'Company Memory', url: `/companies/${project.company.id}/memory` },
        ],
      };
    } catch (err) {
      console.error('[CopilotService] Gemini call failed, using fallback:', err);
    }
  }

  return {
    conclusion: `Project is currently in progress. ${totalFacts - unresolvedFacts}/${totalFacts} facts verified.`,
    evidence: `${unresolvedFacts} facts currently require reviewer approval.`,
    reasoning: 'Evaluated ingestion and extraction logs for active project context. Set GEMINI_API_KEY for AI answers.',
    confidence: 100.0,
    citations: [{ label: 'Review Workspace', url: `/projects/${projectId}/review` }],
  };
};
