/**
 * Khora AI supplier targeting.
 *
 * Which suppliers a business needs cannot be enumerated in a lookup table. A
 * hand-written map only ever knows the trades someone thought to add: a pet
 * groomer, a car wash, a print shop, a plant nursery and a bike repair stall
 * all need completely different suppliers, and the moment a user types a trade
 * nobody anticipated, a static map has nothing useful to say and falls back to
 * "supermarket" — which is exactly the bug this replaces.
 *
 * So Khora decides. Given the business type (and, for a broad category like
 * Services, the specific trade), it returns the supplier categories that
 * business actually buys from, each with a search phrase aimed at that trade,
 * plus the kinds of listing that would be noise for it.
 *
 * Results are cached per business, because this answer only changes when the
 * user's business does — not on every visit to the Suppliers tab.
 */

import { askKhoraAI } from './claude';
import { getSupplierProfileForBusiness } from './places';

export interface SupplierCategory {
  /** Short chip label, e.g. "Car Care Chemicals". */
  label: string;
  /** Text query sent to Places, e.g. "car wash soap and wax supplier". */
  search?: string;
  /** Google place types, used by the built-in fallback profiles. */
  types?: string[];
}

export interface SupplierProfileResult {
  categories: SupplierCategory[];
  /** Free-text used when browsing with no category or query selected. */
  browseSearch: string;
  /** Listing keywords that are noise for THIS business. */
  avoid: string[];
  /** One-line guidance shown above the results. */
  tip: string;
  source: 'khora-ai' | 'offline';
}

const AI_TIMEOUT_MS = 20000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a business type rarely changes

interface CacheEntry {
  profile: SupplierProfileResult;
  savedAt: number;
}

// In-memory so it survives navigation, localStorage so it survives a reload on
// web. On native localStorage is undefined and the memory cache carries it for
// the session, which is enough to keep this off the critical path.
const memoryCache = new Map<string, CacheEntry>();

const cacheKey = (businessType: string, detail?: string | null) =>
  `likhora_suppliers_${businessType.toLowerCase().trim()}_${(detail || '').toLowerCase().trim()}`;

const readCache = (key: string): SupplierProfileResult | null => {
  const inMemory = memoryCache.get(key);
  if (inMemory && Date.now() - inMemory.savedAt < CACHE_TTL_MS) return inMemory.profile;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry;
        if (parsed?.profile && Date.now() - parsed.savedAt < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.profile;
        }
      }
    } catch {
      // A corrupt entry is not worth failing over — fall through and re-ask.
    }
  }
  return null;
};

const writeCache = (key: string, profile: SupplierProfileResult) => {
  const entry: CacheEntry = { profile, savedAt: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Quota or private mode — the memory cache still does its job.
    }
  }
};

const buildPrompt = (businessType: string, detail?: string | null, location?: string | null): string => {
  const trade = detail?.trim() ? `${businessType} — specifically: ${detail.trim()}` : businessType;

  return [
    `A Filipino micro-entrepreneur runs this business: ${trade}.`,
    location ? `They are located in ${location}.` : '',
    '',
    'List the kinds of SUPPLIER this specific business buys from. Think about what',
    'they actually spend money on to operate: the materials they use up per job or',
    'per sale, the equipment they work with, and anything they resell.',
    '',
    'A car wash buys car shampoo, wax, microfibre cloths and pressure washers — not',
    'groceries. A pet groomer buys clippers, shampoo and pet supplies. A print shop',
    'buys ink, paper and vinyl. Be this specific to the trade named above.',
    '',
    'Each search phrase will be sent to Google Places to find real shops in the',
    'Philippines, so phrase it the way such a shop would describe itself.',
    '',
    'Reply with ONLY a JSON object, no markdown fence and no text around it:',
    '{',
    '  "categories": [',
    '    { "label": "<2-3 word chip label>", "search": "<Places search phrase for this supplier type>" }',
    '  ],',
    '  "browse_search": "<one general search phrase for suppliers of this trade>",',
    '  "avoid": ["<listing keywords that would be irrelevant noise for this business>"],',
    '  "tip": "<one sentence of practical sourcing advice for this trade>"',
    '}',
    '',
    'Give 4-6 categories. Keep labels short enough to fit a chip. No markdown.',
  ]
    .filter(Boolean)
    .join('\n');
};

/** Pulls the first balanced {...} block out of a reply, fence or prose included. */
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

const cleanText = (value: any, maxLength: number): string =>
  typeof value === 'string'
    ? value.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';

/** The built-in profiles, reshaped — used only when Khora can't be reached. */
const offlineProfile = (businessType?: string): SupplierProfileResult => {
  const fallback = getSupplierProfileForBusiness(businessType);

  return {
    categories: fallback.categories.map((label) => {
      const config = fallback.searchMap[label];
      return { label, search: config?.textQuery, types: config?.types };
    }),
    browseSearch: fallback.browseKeyword,
    avoid: [],
    tip: fallback.tip,
    source: 'offline',
  };
};

/**
 * The supplier categories this business needs. Always resolves: an unreachable
 * or unusable AI answer falls back to the built-in profiles.
 */
export const getAISupplierProfile = async (
  businessType?: string | null,
  options?: { detail?: string | null; location?: string | null }
): Promise<SupplierProfileResult> => {
  const trade = (businessType || '').trim();
  if (!trade) return offlineProfile(businessType || undefined);

  const key = cacheKey(trade, options?.detail);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(trade, options?.detail, options?.location),
        'You are Khora AI, an expert on how Filipino micro-businesses source their materials. When asked for JSON, reply with raw JSON only — no prose, no markdown fences.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) return offlineProfile(trade);

    const parsed = extractJsonObject(response.content);
    if (!parsed) return offlineProfile(trade);

    const categories: SupplierCategory[] = Array.isArray(parsed.categories)
      ? parsed.categories
          .map((entry: any) => ({
            label: cleanText(entry?.label, 28),
            search: cleanText(entry?.search, 120),
          }))
          .filter((entry: SupplierCategory) => entry.label && entry.search)
          .slice(0, 6)
      : [];

    // Fewer than three categories is not a usable chip row, and suggests the
    // model did not understand the trade — better to use the built-ins.
    if (categories.length < 3) return offlineProfile(trade);

    const profile: SupplierProfileResult = {
      categories,
      browseSearch: cleanText(parsed.browse_search, 120) || `${trade} supplies supplier`,
      avoid: Array.isArray(parsed.avoid)
        ? parsed.avoid.map((item: any) => cleanText(item, 40).toLowerCase()).filter(Boolean).slice(0, 12)
        : [],
      tip:
        cleanText(parsed.tip, 220) ||
        `For your ${trade} business, compare at least three suppliers before committing.`,
      source: 'khora-ai',
    };

    writeCache(key, profile);
    return profile;
  } catch {
    return offlineProfile(trade);
  }
};
