import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { createOrUpdateMemory } from './memoryService';
import { extractDocumentContent } from './extractor';
import {
  ACCOUNTING_ONTOLOGY_DICTIONARY,
  FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT,
  HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY,
  SCENARIO_TRAINING_LIBRARY,
} from '../config/financialPrompt';
import {
  getGeminiConfig,
  isGeminiConfigured,
  synthesizeTrainingPlaybookWithGemini,
} from './geminiService';

/** Organization-wide training memory key (not a real MCA CIN). */
export const GLOBAL_TRAINING_CIN = '__GLOBAL_AI_TRAINING__';

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt']);

export interface AiTrainingResult {
  trainedAt: string;
  dropFoldersScanned: string[];
  filesProcessed: number;
  filesSkipped: number;
  scenarioCount: number;
  homonymousExampleCount: number;
  ontologyTermCount: number;
  xbrlMappingsLearned: number;
  knowledgeGraphNodesCreated: number;
  promptRegistryBytes: number;
  geminiTrainingEnabled: boolean;
  geminiModel: string | null;
  geminiPlaybookGenerated: boolean;
  geminiFinetuneJsonlPath: string | null;
}

export interface AiTrainingStatus {
  lastTrainedAt: string | null;
  scenarioCount: number;
  homonymousExampleCount: number;
  exemplarFileCount: number;
  globalMappingCount: number;
  promptVersionHash: string;
  geminiConfigured: boolean;
  geminiModel: string | null;
  hasGeminiPlaybook: boolean;
}

const hashString = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const resolveTrainingDropFolders = (): string[] => {
  const backendRoot = path.resolve(__dirname, '../..');
  const fromEnv = process.env.TRAINING_DROP_FOLDER || process.env.CLIENT_DROP_FOLDER;
  const folders = [
    fromEnv ? path.resolve(fromEnv) : path.join(backendRoot, 'training-drop'),
    path.join(backendRoot, 'uploads'),
  ];
  if (process.env.TRAINING_INCLUDE_REPO_SAMPLES === 'true') {
    folders.push(path.resolve(backendRoot, '..'));
  }
  return [...new Set(folders)];
};

const listTrainingFiles = (folders: string[]): string[] => {
  const files: string[] = [];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;

    const walk = (dir: string, depth: number) => {
      if (depth > 4) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
          walk(full, depth + 1);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          files.push(full);
        }
        if (ext === '.xml' && (entry.name.toLowerCase().includes('xbrl') || full.includes(`${path.sep}xbrl${path.sep}`))) {
          files.push(full);
        }
      }
    };

    walk(folder, 0);
  }

  return [...new Set(files)];
};

const fileTypeFromPath = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.xlsx' || ext === '.xls') return 'xlsx';
  return 'txt';
};

const parseXbrlElementMappings = (xmlContent: string): { elementName: string; value: string }[] => {
  const mappings: { elementName: string; value: string }[] = [];
  const tagRegex = /<(?:[\w-]+:)?([\w]+)[^>]*contextRef="[^"]*"[^>]*>([^<]*)</g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xmlContent)) !== null) {
    const elementName = match[1];
    const value = match[2]?.trim();
    if (!elementName || !value) continue;
    if (elementName === 'xbrl' || elementName === 'context' || elementName === 'unit') continue;
    mappings.push({ elementName, value });
  }
  return mappings;
};

export const getActiveTrainingContext = async (): Promise<string> => {
  const [scenarioMem, homonymMem] = await Promise.all([
    prisma.companyMemory.findFirst({
      where: { companyCin: GLOBAL_TRAINING_CIN, category: 'TRAINING', keyName: 'scenario_library' },
    }),
    prisma.companyMemory.findFirst({
      where: { companyCin: GLOBAL_TRAINING_CIN, category: 'TRAINING', keyName: 'homonymous_label_library' },
    }),
  ]);

  const scenarioBlock = scenarioMem?.dataValue
    ? `Registered edge-case scenarios:\n${scenarioMem.dataValue}`
    : `Registered edge-case scenarios:\n${SCENARIO_TRAINING_LIBRARY.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  const homonymBlock = homonymMem?.dataValue
    ? `Homonymous label disambiguation examples:\n${homonymMem.dataValue}`
    : `Homonymous label disambiguation examples:\n${JSON.stringify(HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY, null, 2)}`;

  const playbookMem = await prisma.companyMemory.findFirst({
    where: { companyCin: GLOBAL_TRAINING_CIN, category: 'TRAINING', keyName: 'gemini_playbook' },
  });

  const playbookBlock = playbookMem?.dataValue
    ? `\n\nGemini-synthesized filing playbook:\n${playbookMem.dataValue}`
    : '';

  return `${scenarioBlock}\n\n${homonymBlock}${playbookBlock}`;
};

export const getAiTrainingStatus = async (): Promise<AiTrainingStatus> => {
  const manifest = await prisma.companyMemory.findFirst({
    where: { companyCin: GLOBAL_TRAINING_CIN, category: 'TRAINING', keyName: 'training_manifest' },
  });

  let lastTrainedAt: string | null = null;
  let exemplarFileCount = 0;
  if (manifest?.dataValue) {
    try {
      const parsed = JSON.parse(manifest.dataValue);
      lastTrainedAt = parsed.trainedAt ?? null;
      exemplarFileCount = parsed.filesProcessed ?? 0;
    } catch {
      // ignore corrupt manifest
    }
  }

  const globalMappingCount = await prisma.companyMemory.count({
    where: { companyCin: GLOBAL_TRAINING_CIN, category: 'MAPPINGS' },
  });

  const playbookMem = await prisma.companyMemory.findFirst({
    where: { companyCin: GLOBAL_TRAINING_CIN, category: 'TRAINING', keyName: 'gemini_playbook' },
  });

  const { model, tunedModel } = getGeminiConfig();

  return {
    lastTrainedAt,
    scenarioCount: SCENARIO_TRAINING_LIBRARY.length,
    homonymousExampleCount: HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY.length,
    exemplarFileCount,
    globalMappingCount,
    promptVersionHash: hashString(FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT),
    geminiConfigured: isGeminiConfigured(),
    geminiModel: isGeminiConfigured() ? tunedModel || model : null,
    hasGeminiPlaybook: Boolean(playbookMem?.dataValue),
  };
};

const buildGeminiFinetuneJsonl = async (): Promise<string | null> => {
  const exemplars = await prisma.companyMemory.findMany({
    where: { companyCin: GLOBAL_TRAINING_CIN, category: 'EXTRACTION_EXEMPLAR' },
    take: 500,
  });

  if (exemplars.length === 0) return null;

  const lines = exemplars.map((row) => {
    let sample: { label?: string; lineContext?: string; sampleValue?: number } = {};
    try {
      sample = JSON.parse(row.dataValue);
    } catch {
      sample = { label: row.keyName };
    }
    return JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extract the canonical financial fact for Indian MCA XBRL from this line:\n${sample.lineContext || sample.label}`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                factKey: sample.label,
                value: sample.sampleValue,
                evidence: sample.lineContext,
                confidencePolicy: 'flag_if_below_90_percent',
              }),
            },
          ],
        },
      ],
    });
  });

  const outDir = path.resolve(__dirname, '../../training-data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'gemini-supervised-tuning.jsonl');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  return outPath;
};

export const runAiModelTraining = async (): Promise<AiTrainingResult> => {
  const trainedAt = new Date().toISOString();
  const dropFolders = resolveTrainingDropFolders();
  const allFiles = listTrainingFiles(dropFolders);

  let filesProcessed = 0;
  let filesSkipped = 0;
  let xbrlMappingsLearned = 0;
  let knowledgeGraphNodesCreated = 0;

  await createOrUpdateMemory(
    GLOBAL_TRAINING_CIN,
    'PROMPT_REGISTRY',
    'financial_intelligence_system',
    FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT,
    undefined,
    'SYSTEM_TRAIN'
  );

  await createOrUpdateMemory(
    GLOBAL_TRAINING_CIN,
    'TRAINING',
    'scenario_library',
    SCENARIO_TRAINING_LIBRARY.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    undefined,
    'SYSTEM_TRAIN'
  );

  await createOrUpdateMemory(
    GLOBAL_TRAINING_CIN,
    'TRAINING',
    'homonymous_label_library',
    JSON.stringify(HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY),
    undefined,
    'SYSTEM_TRAIN'
  );

  await createOrUpdateMemory(
    GLOBAL_TRAINING_CIN,
    'TRAINING',
    'accounting_ontology',
    JSON.stringify(ACCOUNTING_ONTOLOGY_DICTIONARY),
    undefined,
    'SYSTEM_TRAIN'
  );

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.xml') {
      try {
        const xml = fs.readFileSync(filePath, 'utf-8');
        const mappings = parseXbrlElementMappings(xml);
        for (const m of mappings) {
          await createOrUpdateMemory(
            GLOBAL_TRAINING_CIN,
            'MAPPINGS',
            `xbrl:${m.elementName}`,
            JSON.stringify({
              elementName: m.elementName,
              sampleValue: m.value,
              sourceFile: path.basename(filePath),
            }),
            undefined,
            'SYSTEM_TRAIN'
          );
          xbrlMappingsLearned++;
        }
        filesProcessed++;
      } catch {
        filesSkipped++;
      }
      continue;
    }

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      filesSkipped++;
      continue;
    }

    try {
      const terms = await extractDocumentContent(filePath, fileTypeFromPath(filePath));
      if (terms.length === 0) {
        filesSkipped++;
        continue;
      }

      await prisma.knowledgeGraph.create({
        data: {
          nodeType: 'TRAINING_EXEMPLAR',
          label: path.basename(filePath),
          properties: JSON.stringify({
            sourcePath: filePath,
            trainedAt,
            termCount: terms.length,
            labels: terms.map((t) => t.label),
            sampleContext: terms.slice(0, 5).map((t) => ({
              label: t.label,
              value: t.parsedValue,
              context: t.lineContext,
            })),
          }),
          relationType: 'LEARNED_FROM_FILE',
        },
      });
      knowledgeGraphNodesCreated++;

      for (const term of terms) {
        await createOrUpdateMemory(
          GLOBAL_TRAINING_CIN,
          'EXTRACTION_EXEMPLAR',
          `label:${term.label.toLowerCase()}`,
          JSON.stringify({
            label: term.label,
            sampleValue: term.parsedValue,
            lineContext: term.lineContext,
            sourceFile: path.basename(filePath),
          }),
          undefined,
          'SYSTEM_TRAIN'
        );
      }

      filesProcessed++;
    } catch {
      filesSkipped++;
    }
  }

  let geminiPlaybookGenerated = false;
  let geminiFinetuneJsonlPath: string | null = null;
  const { model, tunedModel } = getGeminiConfig();

  geminiFinetuneJsonlPath = await buildGeminiFinetuneJsonl();

  if (isGeminiConfigured()) {
    try {
      const exemplarMem = await prisma.companyMemory.findMany({
        where: { companyCin: GLOBAL_TRAINING_CIN, category: 'EXTRACTION_EXEMPLAR' },
        take: 80,
      });
      const corpus = [
        FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT,
        SCENARIO_TRAINING_LIBRARY.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        JSON.stringify(HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY),
        JSON.stringify(exemplarMem.map((m) => m.dataValue)),
      ].join('\n\n');

      const synthesis = await synthesizeTrainingPlaybookWithGemini(corpus);
      await createOrUpdateMemory(
        GLOBAL_TRAINING_CIN,
        'TRAINING',
        'gemini_playbook',
        synthesis.playbookMarkdown,
        undefined,
        'GEMINI_TRAIN'
      );
      await createOrUpdateMemory(
        GLOBAL_TRAINING_CIN,
        'TRAINING',
        'gemini_playbook_meta',
        JSON.stringify({
          extractionRules: synthesis.extractionRules,
          taxonomyHints: synthesis.taxonomyHints,
          reviewTriggers: synthesis.reviewTriggers,
          model: tunedModel || model,
          trainedAt,
        }),
        undefined,
        'GEMINI_TRAIN'
      );
      geminiPlaybookGenerated = true;
      console.log('[AiTraining] Gemini playbook synthesis completed.');
    } catch (err) {
      console.error('[AiTraining] Gemini training pass failed:', err);
    }
  } else {
    console.warn('[AiTraining] GEMINI_API_KEY not set — skipped Gemini playbook synthesis.');
  }

  const result: AiTrainingResult = {
    trainedAt,
    dropFoldersScanned: dropFolders.filter((f) => fs.existsSync(f)),
    filesProcessed,
    filesSkipped,
    scenarioCount: SCENARIO_TRAINING_LIBRARY.length,
    homonymousExampleCount: HOMONYMOUS_LABEL_CONTEXT_TRAINING_LIBRARY.length,
    ontologyTermCount: Object.keys(ACCOUNTING_ONTOLOGY_DICTIONARY).length,
    xbrlMappingsLearned,
    knowledgeGraphNodesCreated,
    promptRegistryBytes: FINANCIAL_INTELLIGENCE_SYSTEM_PROMPT.length,
    geminiTrainingEnabled: isGeminiConfigured(),
    geminiModel: isGeminiConfigured() ? tunedModel || model : null,
    geminiPlaybookGenerated,
    geminiFinetuneJsonlPath,
  };

  await createOrUpdateMemory(
    GLOBAL_TRAINING_CIN,
    'TRAINING',
    'training_manifest',
    JSON.stringify(result),
    undefined,
    'SYSTEM_TRAIN'
  );

  await prisma.auditLog.create({
    data: {
      email: 'SYSTEM',
      action: 'AI_MODEL_TRAINING_COMPLETED',
      targetId: GLOBAL_TRAINING_CIN,
      targetType: 'AiTraining',
      details: JSON.stringify(result),
    },
  });

  console.log('[AiTraining] Completed model training run:', result);
  return result;
};
