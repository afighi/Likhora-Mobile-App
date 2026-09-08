/**
 * Khora AI pricing advisor.
 *
 * The user tells the calculator what a product cost them. Deciding what to
 * SELL it for — the category it falls under, the markup that's normal for
 * that category, and whether the resulting price is realistic for their
 * kind of store — is this file's job, not the user's.
 *
 * Every path returns a usable suggestion. If the AI endpoint isn't
 * configured, times out, or answers with something that doesn't survive
 * validation, we fall back to the deterministic offline suggestion in
 * services/calculator.ts rather than showing the user an error.
 */

import { askKhoraAI } from './claude';
import {
  CostBreakdown,
  PurchaseMode,
  getCategoryPresets,
  offlinePricingSuggestion,
  roundToPracticalPrice,
} from './calculator';

export type SuggestionConfidence = 'high' | 'medium' | 'estimate';

export interface PriceSuggestion {
  category: string;
  sellingPrice: number;
  markupPercent: number; // recomputed from the FINAL rounded price, so the two always agree
  reasoning: string; // 1-2 plain Taglish sentences shown on the result card
  tips: string[]; // at most 2 short, actionable notes
  confidence: SuggestionConfidence;
  source: 'khora-ai' | 'offline';
}

export interface PriceSuggestionRequest {
  productName: string;
  cost: CostBreakdown;
  purchaseMode: PurchaseMode;
  businessType?: string | null;
  location?: string | null;
  estimatedDailyUnitsSold?: number | null;
  businessLabel?: string | null;
}

const AI_TIMEOUT_MS = 12000;

const MODE_LABELS: { [key in PurchaseMode]: string } = {
  piece: 'bought per piece',
  pack: 'bought by the pack',
  case: 'bought by the case',
  kilo: 'bought by the kilo and portioned into pieces',
  liter: 'bought by the liter and portioned into pieces',
};

const buildPrompt = (req: PriceSuggestionRequest): string => {
  const presets = getCategoryPresets(req.businessType)
    .map((preset) => `${preset.name}: ~${preset.markupPercent}%`)
    .join(', ');

  return [
    'You are Khora AI, pricing a product for a Filipino micro-entrepreneur.',
    '',
    'PRODUCT',
    `- Name: ${req.productName}`,
    `- How it is bought: ${MODE_LABELS[req.purchaseMode]}`,
    `- Cost to acquire per piece (puhunan): PHP ${req.cost.puhunan.toFixed(2)}`,
    `- Extra cost per piece (dagdag gastos: ice, plastic, kuryente, pamasahe): PHP ${req.cost.dagdagGastosPerPiece.toFixed(2)}`,
    `- TOTAL cost per piece: PHP ${req.cost.totalCostPerPiece.toFixed(2)}`,
    req.cost.batchPieces > 0
      ? `- Batch: ${req.cost.batchPieces} pieces, PHP ${req.cost.batchTotalInvestment.toFixed(2)} total capital`
      : '- Batch size: not given',
    req.estimatedDailyUnitsSold
      ? `- Sells about ${req.estimatedDailyUnitsSold} pieces per day`
      : '- Daily sales volume: not given',
    '',
    'SELLER',
    `- Business type: ${req.businessType || 'small Filipino business'}`,
    `- Location: ${req.location || 'Philippines'}`,
    req.businessLabel ? `- Part of this business roadmap: ${req.businessLabel}` : '',
    '',
    'TYPICAL LOCAL MARKUPS FOR THIS BUSINESS TYPE',
    presets,
    '',
    'TASK',
    'Decide the selling price. Ground it in what Filipino customers actually pay',
    'for this kind of item in a neighbourhood store — not a generic markup rule.',
    'The price must be strictly higher than the total cost per piece, and should',
    'be a price a customer can pay in ordinary coins and bills.',
    '',
    'Reply with ONLY a JSON object, no markdown fence and no text around it:',
    '{',
    '  "category": "<short product category>",',
    '  "selling_price": <number, PHP>,',
    '  "markup_percent": <number>,',
    '  "reasoning": "<1-2 short sentences in plain English explaining why this price. No markdown.>",',
    '  "tips": ["<short practical tip>", "<optional second tip>"],',
    '  "confidence": "high" | "medium" | "estimate"',
    '}',
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Pulls the first balanced {...} block out of a reply, so a model that adds
 * a greeting or a ```json fence around the object still parses.
 */
const extractJsonObject = (text: string): any | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const toNumber = (value: any): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const cleanText = (value: any, maxLength: number): string =>
  typeof value === 'string'
    ? value.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';

const buildOfflineSuggestion = (req: PriceSuggestionRequest): PriceSuggestion => {
  const offline = offlinePricingSuggestion(
    req.productName,
    req.cost.totalCostPerPiece,
    req.businessType
  );
  const profit = offline.sellingPrice - req.cost.totalCostPerPiece;

  return {
    category: offline.category,
    sellingPrice: offline.sellingPrice,
    markupPercent: markupFromPrice(offline.sellingPrice, req.cost.totalCostPerPiece),
    reasoning:
      `Based on what ${offline.category.toLowerCase()} usually sells for in small businesses, ` +
      `a ${offline.markupPercent}% markup fits here. At PHP ${offline.sellingPrice.toFixed(2)} ` +
      `you make PHP ${profit.toFixed(2)} profit per piece.`,
    tips: ['Compare against the nearest competitor before locking this price in.'],
    confidence: 'estimate',
    source: 'offline',
  };
};

const markupFromPrice = (price: number, totalCost: number): number =>
  totalCost > 0 ? Math.round(((price - totalCost) / totalCost) * 1000) / 10 : 0;

/**
 * Asks Khora AI for a price, validates the answer, and falls back to the
 * offline suggestion whenever the answer can't be trusted.
 *
 * Validation matters here: a hallucinated price below cost would quietly
 * tell a user to sell at a loss, so anything at or under total cost — or
 * absurdly above it — is rejected outright rather than clamped into shape.
 */
export const suggestPrice = async (req: PriceSuggestionRequest): Promise<PriceSuggestion> => {
  const { totalCostPerPiece } = req.cost;

  if (totalCostPerPiece <= 0) return buildOfflineSuggestion(req);

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(req),
        'You are Khora AI, a Filipino MSME pricing expert. When asked for JSON, reply with raw JSON only — no prose, no markdown fences.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) return buildOfflineSuggestion(req);

    const parsed = extractJsonObject(response.content);
    if (!parsed) return buildOfflineSuggestion(req);

    const rawPrice = toNumber(parsed.selling_price);
    // Reject a price that loses money, and one so high it can only be a
    // misread of the cost (6x cost is already well past any local markup).
    if (rawPrice <= totalCostPerPiece || rawPrice > totalCostPerPiece * 6) {
      return buildOfflineSuggestion(req);
    }

    const sellingPrice = roundToPracticalPrice(rawPrice);
    const reasoning = cleanText(parsed.reasoning, 260);
    if (!reasoning) return buildOfflineSuggestion(req);

    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.map((tip: any) => cleanText(tip, 120)).filter(Boolean).slice(0, 2)
      : [];

    const confidence: SuggestionConfidence =
      parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'estimate';

    return {
      category: cleanText(parsed.category, 40) || 'General',
      sellingPrice,
      // Recomputed from the rounded price rather than trusting the model's
      // own percentage, so the number shown always matches the price shown.
      markupPercent: markupFromPrice(sellingPrice, totalCostPerPiece),
      reasoning,
      tips,
      confidence,
      source: 'khora-ai',
    };
  } catch {
    return buildOfflineSuggestion(req);
  }
};
