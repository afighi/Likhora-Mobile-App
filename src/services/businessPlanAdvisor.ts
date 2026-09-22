/**
 * Objective 5: AI-assisted business planning — name/description generation.
 * Same JSON/timeout/offline-fallback conventions as pricingAdvisor.ts and
 * marketAnalysis.ts.
 */

import { askKhoraAI } from './claude';
import { extractJsonObject, cleanText } from '@/utils/json';

const AI_TIMEOUT_MS = 15000;

export interface BusinessNameSuggestion {
  name: string;
  tagline: string;
}

export interface BusinessNameRequest {
  businessType: string;
  keywords: string;
  location?: string | null;
}

const buildPrompt = (req: BusinessNameRequest): string =>
  [
    'You are Khora AI, naming a business for a Filipino micro-entrepreneur.',
    '',
    `BUSINESS TYPE: ${req.businessType}`,
    `KEYWORDS / VIBE: ${req.keywords}`,
    req.location ? `LOCATION: ${req.location}` : '',
    '',
    'TASK',
    'Suggest 4-5 distinct, memorable business names, each with a short tagline (max 10 words).',
    'Names must be original — do not reuse or lightly modify an existing well-known brand name.',
    'Keep language family-friendly and appropriate for a public storefront.',
    '',
    'Reply with ONLY a JSON object, no markdown fence and no text around it:',
    '{ "suggestions": [ { "name": "<name>", "tagline": "<short tagline>" } ] }',
  ]
    .filter(Boolean)
    .join('\n');

const OFFLINE_SUGGESTIONS: BusinessNameSuggestion[] = [
  { name: 'Likha Corner', tagline: 'Made with care, sold with pride.' },
  { name: 'Bida Bites & Goods', tagline: 'Everyday favorites, done right.' },
  { name: 'Sarap Hub', tagline: 'Local flavor, honest prices.' },
  { name: 'Tibay Trading', tagline: 'Built to last, priced to sell.' },
];

/** Asks Khora AI for name/tagline suggestions; falls back to a small
 *  generic offline set (clearly not business-specific) if unreachable. */
export const generateBusinessNames = async (req: BusinessNameRequest): Promise<{
  suggestions: BusinessNameSuggestion[];
  source: 'khora-ai' | 'offline';
}> => {
  if (!req.keywords.trim() && !req.businessType.trim()) {
    return { suggestions: [], source: 'offline' };
  }

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(req),
        'You are Khora AI, a Filipino MSME branding advisor. When asked for JSON, reply with raw JSON only — no prose, no markdown fences.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) {
      return { suggestions: OFFLINE_SUGGESTIONS, source: 'offline' };
    }

    const parsed = extractJsonObject(response.content);
    const raw = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
    const suggestions: BusinessNameSuggestion[] = raw
      .map((s: any) => ({ name: cleanText(s.name, 60), tagline: cleanText(s.tagline, 100) }))
      .filter((s: BusinessNameSuggestion) => s.name)
      .slice(0, 5);

    if (suggestions.length === 0) return { suggestions: OFFLINE_SUGGESTIONS, source: 'offline' };

    return { suggestions, source: 'khora-ai' };
  } catch {
    return { suggestions: OFFLINE_SUGGESTIONS, source: 'offline' };
  }
};
