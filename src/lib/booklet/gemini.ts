import type { z } from 'zod';
import { getSetting } from '@/lib/settings';

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_CLOUD_PROJECT for Vertex AI) in Admin → Settings → Credentials.');
  }
}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
export type JsonSchema = Record<string, unknown>;

/** Minimal surface the pipeline needs; tests inject a mock. */
export interface JsonGenerator {
  readonly model: string;
  generate(parts: GeminiPart[], schema: JsonSchema, temperature: number): Promise<string>;
}

let override: JsonGenerator | null = null;
/** Test hook: route all Gemini calls to a mock. Pass null to restore. */
export function setJsonGeneratorForTests(g: JsonGenerator | null) {
  override = g;
}

export async function getJsonGenerator(): Promise<JsonGenerator> {
  if (override) return override;
  const [apiKey, project, location, modelSetting] = await Promise.all([
    getSetting('GEMINI_API_KEY'),
    getSetting('GOOGLE_CLOUD_PROJECT'),
    getSetting('GOOGLE_CLOUD_LOCATION'),
    getSetting('GEMINI_MODEL')
  ]);
  if (!apiKey && !project) throw new GeminiNotConfiguredError();
  const { GoogleGenAI } = await import('@google/genai');
  // Credential modes: Vertex "express" keys start with "AQ." and must be used
  // with vertexai:true; other keys are Gemini Developer API keys; with no key,
  // Vertex AI uses Application Default Credentials + GOOGLE_CLOUD_PROJECT.
  // If the key is rejected (401/403) and a project is configured, fall back to
  // Vertex ADC so an expired key doesn't take the feature down.
  const clients: { name: string; ai: InstanceType<typeof GoogleGenAI> }[] = [];
  if (apiKey)
    clients.push({
      name: 'api-key',
      ai: apiKey.startsWith('AQ.') ? new GoogleGenAI({ vertexai: true, apiKey }) : new GoogleGenAI({ apiKey })
    });
  if (project) clients.push({ name: 'vertex-adc', ai: new GoogleGenAI({ vertexai: true, project, location: location || 'global' }) });
  const model = modelSetting || 'gemini-2.5-flash';
  let active = 0;
  return {
    model,
    async generate(parts, schema, temperature) {
      for (;;) {
        try {
          const res = await clients[active].ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: parts as any }],
            config: { responseMimeType: 'application/json', responseSchema: schema as any, temperature }
          });
          return res.text ?? '';
        } catch (e: any) {
          const status = Number(e?.status ?? e?.code ?? 0);
          if ((status === 401 || status === 403) && active < clients.length - 1) {
            active++;
            continue;
          }
          throw e;
        }
      }
    }
  };
}

/** Call the generator, retry on 429/5xx/bad JSON, validate with zod. */
export async function generateJson<T>(
  gen: JsonGenerator,
  parts: GeminiPart[],
  schema: JsonSchema,
  zod: z.ZodType<T>,
  temperature = 0.2,
  retryDelayMs = 2000
): Promise<T> {
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    let text = '';
    try {
      text = await gen.generate(parts, schema, temperature);
    } catch (e: any) {
      const status = Number(e?.status ?? e?.code ?? 0);
      if (status === 429 || status >= 500) {
        lastErr = `HTTP ${status}`;
        await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
        continue;
      }
      throw new Error(`Gemini error ${status || ''}: ${String(e?.message ?? e).slice(0, 300)}`);
    }
    try {
      return zod.parse(JSON.parse(text));
    } catch (e) {
      lastErr = `invalid JSON/schema: ${(e as Error).message.slice(0, 200)}`;
    }
  }
  throw new Error(`Gemini failed after retries (${lastErr})`);
}

// ---- JSON-schema builders (Gemini responseSchema dialect) ------------------
export const S = (type: string, extra: JsonSchema = {}): JsonSchema => ({ type, ...extra });
export const obj = (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchema =>
  S('OBJECT', { properties, required });
export const arr = (items: JsonSchema): JsonSchema => S('ARRAY', { items });
export const str = S('STRING');
