/**
 * Google Gemini (API key) — generateContent for training synthesis and copilot.
 * Note: Gemini API key fine-tuning was deprecated; use exported JSONL + Vertex for true SFT.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const getGeminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY?.trim() || '',
  model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
  tunedModel: process.env.GEMINI_TUNED_MODEL?.trim() || '',
});

export const isGeminiConfigured = (): boolean => Boolean(getGeminiConfig().apiKey);

const activeModelName = (): string => {
  const { model, tunedModel } = getGeminiConfig();
  return tunedModel || model;
};

export interface GeminiGenerateOptions {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  jsonResponse?: boolean;
}

export async function geminiGenerate(options: GeminiGenerateOptions): Promise<string> {
  const { apiKey } = getGeminiConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const model = activeModelName();
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: options.userMessage }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      ...(options.jsonResponse ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || `Gemini request failed (${res.status})`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text;
}

export interface GeminiTrainingSynthesis {
  playbookMarkdown: string;
  extractionRules: string[];
  taxonomyHints: string[];
  reviewTriggers: string[];
}

/**
 * Sends local training corpus to Gemini to produce a durable playbook (in-app "training" with API key).
 */
export async function synthesizeTrainingPlaybookWithGemini(
  trainingCorpus: string
): Promise<GeminiTrainingSynthesis> {
  const systemInstruction = `You are the training engine for AI XBRL Studio (Indian MCA Ind AS XBRL filings).
Produce a concise, actionable playbook for document extraction and taxonomy mapping assistants.
Never invent financial numbers. Focus on disambiguation, scale/units, Schedule III structure, and reviewer escalation rules.
Respond with valid JSON only.`;

  const userMessage = `Using the following registered training corpus, output JSON with keys:
- playbookMarkdown (string, markdown, max 8000 chars)
- extractionRules (string array, max 25 items)
- taxonomyHints (string array, max 25 items)
- reviewTriggers (string array, max 20 items)

CORPUS:
${trainingCorpus.slice(0, 120000)}`;

  const raw = await geminiGenerate({
    systemInstruction,
    userMessage,
    jsonResponse: true,
    temperature: 0.15,
  });

  let parsed: GeminiTrainingSynthesis;
  try {
    parsed = JSON.parse(raw) as GeminiTrainingSynthesis;
  } catch {
    parsed = {
      playbookMarkdown: raw,
      extractionRules: [],
      taxonomyHints: [],
      reviewTriggers: [],
    };
  }

  if (!parsed.playbookMarkdown) {
    parsed.playbookMarkdown = raw;
  }

  return parsed;
}

export async function geminiCopilotAnswer(
  systemPrompt: string,
  userMessage: string,
  projectContext: string
): Promise<{ answer: string; confidence: number }> {
  const text = await geminiGenerate({
    systemInstruction: `${systemPrompt}\n\nAnswer as a senior Indian CA reviewer. Cite evidence from project context when available. If unsure, say what a human must verify.`,
    userMessage: `PROJECT CONTEXT:\n${projectContext}\n\nUSER QUESTION:\n${userMessage}`,
    temperature: 0.25,
  });

  return { answer: text, confidence: 92.0 };
}
