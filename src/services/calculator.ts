/**
 * Smart Calculator — pure pricing/costing math.
 *
 * No I/O here on purpose: everything in this file is a deterministic
 * function of its inputs, so the live preview in the product form and the
 * values actually saved to Supabase can never disagree.
 *
 * The user supplies only what they alone can know — how they bought the
 * product and what it cost them. Choosing the markup is NOT their job:
 * that comes from Khora AI (see services/pricingAdvisor.ts), which builds on
 * the cost breakdown produced here.
 */

export type PurchaseMode = 'piece' | 'pack' | 'case' | 'kilo' | 'liter';
export type MarkupType = 'percent' | 'fixed';

export interface CostInput {
  purchaseMode: PurchaseMode;

  // purchase_mode = 'piece'
  manualCostPerPiece?: number;
  batchPieces?: number; // how many pieces this entry represents, for ROI math

  // purchase_mode = 'pack' | 'case'
  packTotalPrice?: number;
  packItemCount?: number;

  // purchase_mode = 'kilo' | 'liter'
  bulkQuantity?: number; // total bought, e.g. 100 (kg or L)
  bulkTotalPrice?: number;
  bulkPortionSize?: number; // one sellable portion, e.g. 5 (kg or L)

  // Single lump-sum extra cost per piece — ice, plastic, kuryente, pamasahe, etc.
  dagdagGastosPerPiece?: number;
}

export interface CostBreakdown {
  puhunan: number; // base cost per piece, before dagdag gastos
  dagdagGastosPerPiece: number;
  totalCostPerPiece: number; // puhunan + dagdag gastos — what the price is built on

  batchPieces: number;
  batchTotalInvestment: number; // total cash actually spent on this batch
}

export interface PricingOutcome {
  sellingPrice: number;

  tuboPerPiece: number; // profit per piece
  marginPercent: number; // profit as % of selling price
  markupPercentEffective: number; // profit as % of cost

  batchTotalRevenuePotential: number;
  batchTotalProfitPotential: number;

  // "Sell this many pieces and you've earned back what you spent" — based on
  // cumulative revenue reaching the batch investment, which is how a
  // sari-sari owner actually experiences "recovering puhunan" (cash back in
  // hand), not a profit-accumulation model.
  breakevenUnits: number | null;
  breakevenDays: number | null; // only set when estimatedDailyUnitsSold > 0
  remainingPiecesAsProfit: number | null; // batchPieces - breakevenUnits, when positive
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Rounds a computed price up to a practical retail price — never down, so
 * margin is never accidentally eaten by rounding. Coin-range items round to
 * the nearest quarter-peso, everyday items to the nearest whole peso, and
 * bigger-ticket items to the nearest five pesos.
 */
export function roundToPracticalPrice(price: number): number {
  if (price <= 0) return 0;
  if (price < 10) return Math.ceil(price * 4) / 4;
  if (price < 100) return Math.ceil(price);
  return Math.ceil(price / 5) * 5;
}

/**
 * How much one tap of the price stepper moves the price — matched to the
 * same bands roundToPracticalPrice uses, so nudging always lands on a price
 * a customer could actually hand over in coins.
 */
export function priceStep(price: number): number {
  if (price < 10) return 0.25;
  if (price < 100) return 1;
  return 5;
}

/**
 * Turns "how it was bought" into a single cost per piece, plus what the whole
 * batch actually cost. Dagdag gastos counts toward the batch investment too —
 * ice and plastic are real cash out, so break-even has to earn them back.
 */
export function computeCost(input: CostInput): CostBreakdown {
  let puhunan = 0;
  let batchPieces = 0;
  let purchaseSpend = 0; // what was handed over at the supplier, before dagdag gastos

  switch (input.purchaseMode) {
    case 'piece': {
      puhunan = input.manualCostPerPiece || 0;
      batchPieces = input.batchPieces || 0;
      purchaseSpend = puhunan * batchPieces;
      break;
    }
    case 'pack':
    case 'case': {
      const totalPrice = input.packTotalPrice || 0;
      const itemCount = input.packItemCount || 0;
      puhunan = itemCount > 0 ? totalPrice / itemCount : 0;
      batchPieces = itemCount;
      purchaseSpend = totalPrice;
      break;
    }
    case 'kilo':
    case 'liter': {
      const totalPrice = input.bulkTotalPrice || 0;
      const totalQuantity = input.bulkQuantity || 0;
      const portionSize = input.bulkPortionSize || 0;

      // The piece count is derived, never asked for: 100 kg sold in 5 kg packs
      // is 20 packs. Floored, because a leftover 3 kg is not a sellable 5 kg
      // pack — and the money spent on that leftover stays spread across the
      // packs that DO sell, which is what the seller actually paid out.
      const piecesYielded = portionSize > 0 ? Math.floor(totalQuantity / portionSize) : 0;

      puhunan = piecesYielded > 0 ? totalPrice / piecesYielded : 0;
      batchPieces = piecesYielded;
      purchaseSpend = totalPrice;
      break;
    }
  }

  const dagdagGastosPerPiece = input.dagdagGastosPerPiece || 0;
  const totalCostPerPiece = puhunan + dagdagGastosPerPiece;

  return {
    puhunan: round2(puhunan),
    dagdagGastosPerPiece: round2(dagdagGastosPerPiece),
    totalCostPerPiece: round2(totalCostPerPiece),
    batchPieces,
    batchTotalInvestment: round2(purchaseSpend + dagdagGastosPerPiece * batchPieces),
  };
}

/**
 * Everything that follows from "sell it at this price" — profit, margin, and
 * how long until the capital comes back. Kept separate from computeCost so
 * nudging the price re-derives only what depends on it.
 */
export function computeAtPrice(
  cost: CostBreakdown,
  sellingPrice: number,
  estimatedDailyUnitsSold?: number
): PricingOutcome {
  const price = sellingPrice > 0 ? sellingPrice : 0;

  const tuboPerPiece = price - cost.totalCostPerPiece;
  const marginPercent = price > 0 ? (tuboPerPiece / price) * 100 : 0;
  const markupPercentEffective =
    cost.totalCostPerPiece > 0 ? (tuboPerPiece / cost.totalCostPerPiece) * 100 : 0;

  const breakevenUnits =
    price > 0 && cost.batchTotalInvestment > 0
      ? Math.min(Math.ceil(cost.batchTotalInvestment / price), Number.MAX_SAFE_INTEGER)
      : null;

  const remainingPiecesAsProfit =
    breakevenUnits !== null && cost.batchPieces > breakevenUnits
      ? cost.batchPieces - breakevenUnits
      : null;

  const breakevenDays =
    breakevenUnits !== null && (estimatedDailyUnitsSold || 0) > 0
      ? Math.ceil(breakevenUnits / (estimatedDailyUnitsSold as number))
      : null;

  return {
    sellingPrice: round2(price),
    tuboPerPiece: round2(tuboPerPiece),
    marginPercent: round2(marginPercent),
    markupPercentEffective: round2(markupPercentEffective),
    batchTotalRevenuePotential: round2(price * cost.batchPieces),
    batchTotalProfitPotential: round2(tuboPerPiece * cost.batchPieces),
    breakevenUnits,
    breakevenDays,
    remainingPiecesAsProfit,
  };
}

// ----------------------------------------------------
// Reference markups — what a Filipino sari-sari, carinderia, or online
// seller realistically charges by product category. These are given to
// Khora AI as context so its suggestion stays grounded in local pricing,
// and they drive the offline suggestion when the AI is unreachable.
// ----------------------------------------------------
export interface CategoryPreset {
  name: string;
  markupPercent: number;
}

// Keyed by the business_type values in services/businessProfiles.ts. The
// pre-profile type names are kept as aliases below so existing users' saved
// business_type still resolves instead of silently falling back to generic
// markups.
const CATEGORY_PRESETS_BY_BUSINESS_TYPE: { [businessType: string]: CategoryPreset[] } = {
  'Carinderia / Food Stall': [
    { name: 'Ready-to-Sell Meals', markupPercent: 50 },
    { name: 'Ingredients', markupPercent: 30 },
    { name: 'Chilled / Cold Drinks', markupPercent: 22 },
    { name: 'Condiments', markupPercent: 25 },
    { name: 'Packaging', markupPercent: 15 },
  ],
  'Sari-sari Store': [
    { name: 'Snacks / Chips', markupPercent: 18 },
    { name: 'Chilled / Cold Drinks', markupPercent: 22 },
    { name: 'Canned Goods', markupPercent: 12 },
    { name: 'Household Items', markupPercent: 18 },
    { name: 'Personal Care', markupPercent: 18 },
    { name: 'Load & E-Load', markupPercent: 8 },
    { name: 'Rice', markupPercent: 6 },
  ],
  'Online Selling': [
    { name: 'Merchandise', markupPercent: 35 },
    { name: 'Accessories', markupPercent: 40 },
    { name: 'Packaging & Shipping', markupPercent: 10 },
  ],
  // A service business prices its LABOUR, so these are rates per service
  // rather than markups on merchandise — the markup covers the owner's hours,
  // utilities and equipment wear, not just the consumables used up.
  'Serbisyo / Services': [
    { name: 'Service (per session)', markupPercent: 120 },
    { name: 'Home Service', markupPercent: 150 },
    { name: 'Consumables', markupPercent: 40 },
    { name: 'Supplies Resold', markupPercent: 25 },
  ],
  // Resale markups swing hard by item: a ₱200 shirt carries 45%, a ₱60,000
  // motorcycle nothing like it. These are starting points per category, not
  // one blanket rate.
  'Buy & Sell / Reselling': [
    { name: 'Apparel / RTW', markupPercent: 45 },
    { name: 'Accessories', markupPercent: 40 },
    { name: 'Gadgets & Electronics', markupPercent: 25 },
    { name: 'Appliances & Furniture', markupPercent: 20 },
    { name: 'Vehicles & Parts', markupPercent: 12 },
  ],
};

const DEFAULT_CATEGORY_PRESETS: CategoryPreset[] = [
  { name: 'General', markupPercent: 20 },
  { name: 'Raw Materials', markupPercent: 25 },
  { name: 'Packaging', markupPercent: 15 },
  { name: 'Supplies', markupPercent: 20 },
];

// business_type values stored before the five-profile rework.
const LEGACY_BUSINESS_TYPE_ALIASES: { [oldType: string]: string } = {
  Carinderia: 'Carinderia / Food Stall',
  'Food Stall': 'Carinderia / Food Stall',
  'Online Shop': 'Online Selling',
  Services: 'Serbisyo / Services',
  'Clothing & RTW': 'Buy & Sell / Reselling',
  'Buy & Sell / RTW': 'Buy & Sell / Reselling',
  'Delivery / Rides': 'Serbisyo / Services',
};

export const getCategoryPresets = (businessType?: string | null): CategoryPreset[] => {
  if (!businessType) return DEFAULT_CATEGORY_PRESETS;
  const key = CATEGORY_PRESETS_BY_BUSINESS_TYPE[businessType]
    ? businessType
    : LEGACY_BUSINESS_TYPE_ALIASES[businessType];
  return (key && CATEGORY_PRESETS_BY_BUSINESS_TYPE[key]) || DEFAULT_CATEGORY_PRESETS;
};

/**
 * Best-effort category guess from the product name alone. Only used to keep
 * the offline suggestion sensible — when Khora AI is reachable it classifies
 * the product itself, with far more nuance than a keyword list.
 */
const NAME_KEYWORD_CATEGORIES: { keywords: string[]; category: string; markupPercent: number }[] = [
  { keywords: ['load', 'e-load', 'eload', 'gcash'], category: 'Load & E-Load', markupPercent: 8 },
  { keywords: ['bigas', 'rice'], category: 'Rice', markupPercent: 6 },
  { keywords: ['sardinas', 'delata', 'corned', 'canned', 'tuna'], category: 'Canned Goods', markupPercent: 12 },
  {
    keywords: ['coke', 'soft drink', 'softdrink', 'juice', 'tubig', 'water', 'sprite', 'royal', 'yakult', 'kape', 'coffee', 'drink', 'inumin'],
    category: 'Chilled / Cold Drinks',
    markupPercent: 22,
  },
  { keywords: ['chips', 'snack', 'biscuit', 'candy', 'chichirya', 'piattos', 'skyflakes'], category: 'Snacks / Chips', markupPercent: 18 },
  { keywords: ['sabon', 'shampoo', 'toothpaste', 'sachet', 'lotion'], category: 'Personal Care', markupPercent: 18 },
  { keywords: ['plastic', 'supot', 'packaging', 'box', 'cup', 'straw', 'label'], category: 'Packaging', markupPercent: 15 },
  {
    keywords: ['silog', 'ulam', 'meal', 'lutong', 'rice meal', 'adobo', 'sisig', 'lumpia', 'siomai', 'burger', 'fishball', 'kwek'],
    category: 'Ready-to-Sell Meals',
    markupPercent: 50,
  },
  { keywords: ['shirt', 'damit', 'pants', 'dress', 'rtw', 'jacket'], category: 'Apparel', markupPercent: 45 },
];

export interface OfflineSuggestion {
  category: string;
  markupPercent: number;
  sellingPrice: number;
}

/**
 * Deterministic pricing suggestion used when Khora AI can't be reached, so
 * the calculator always produces a usable price instead of an error state.
 */
export function offlinePricingSuggestion(
  productName: string,
  totalCostPerPiece: number,
  businessType?: string | null
): OfflineSuggestion {
  const name = (productName || '').toLowerCase();

  const keywordMatch = NAME_KEYWORD_CATEGORIES.find((entry) =>
    entry.keywords.some((keyword) => name.includes(keyword))
  );

  const fallbackPreset = getCategoryPresets(businessType)[0];
  const category = keywordMatch?.category || fallbackPreset.name;
  let markupPercent = keywordMatch?.markupPercent ?? fallbackPreset.markupPercent;

  // Very cheap items need a wider markup to be worth stocking at all — a 12%
  // markup on a ₱6 sachet is 72 centavos, which rounding alone would erase.
  if (totalCostPerPiece > 0 && totalCostPerPiece < 15 && markupPercent < 20) {
    markupPercent = 20;
  }

  return {
    category,
    markupPercent,
    sellingPrice: roundToPracticalPrice(totalCostPerPiece * (1 + markupPercent / 100)),
  };
}

// Quick examples shown under the "Extra cost per piece" field — not a
// selectable list, since it's a single lump-sum number (ice, plastic bags,
// electricity and fare all added together into one per-piece figure).
export const EXTRA_COST_EXAMPLES = 'ice, plastic bags, electricity, or fare';

// ----------------------------------------------------
// Category naming
// ----------------------------------------------------
// Khora names a category for every product it prices. Left raw, that quietly
// fragments the list — "Cold Drinks", "cold drink" and "Chilled Drinks" would
// each become their own filter chip for what is obviously one category. These
// two helpers keep the naming stable so filtering actually works.

/** Trims, collapses whitespace and title-cases, leaving acronyms (RTW) alone. */
export function normalizeCategoryName(raw: string): string {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'General';

  return cleaned
    .split(' ')
    .map((word) =>
      /^[A-Z0-9&/-]{2,}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ')
    .slice(0, 40);
}

/**
 * Reuses one of the user's existing categories when the new name is really the
 * same thing, and otherwise creates it. Matching ignores case and a trailing
 * plural "s", which covers the overwhelming majority of near-duplicates
 * without guessing at anything cleverer.
 */
export function resolveCategory(raw: string, existingCategories: string[]): string {
  const normalized = normalizeCategoryName(raw);
  const singular = (value: string) => value.toLowerCase().replace(/s$/, '');
  const target = singular(normalized);

  return existingCategories.find((category) => singular(category) === target) || normalized;
}
