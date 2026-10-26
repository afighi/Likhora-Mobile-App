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

  // Direct ingredient/material cost override if explicitly specified
  materialCost?: number;

  // Labor cost per batch — cook, helper, packaging labor, etc.
  laborCostPerBatch?: number;

  // Single lump-sum extra cost per piece — ice, plastic, kuryente, pamasahe, etc. (Overhead)
  dagdagGastosPerPiece?: number;
}

export interface CostBreakdown {
  materialCostPerPiece: number; // material cost per piece
  laborCostPerPiece: number;    // labor cost per piece (laborCostPerBatch / batchPieces)
  overheadPerPiece: number;     // overhead (dagdag-gastos) per piece
  puhunan: number;              // base production cost per piece (material + labor)
  dagdagGastosPerPiece: number; // overhead per piece (same as overheadPerPiece for backwards compatibility)
  totalCostPerPiece: number;    // puhunan + dagdag gastos — what the price is built on

  batchPieces: number;
  batchMaterialSpend: number;
  batchLaborSpend: number;
  batchOverheadSpend: number;
  batchTotalInvestment: number; // total cash actually spent on this batch (material + labor + overhead)
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
 * batch actually cost. Material and labor are accounted for per batch, and
 * overhead (dagdag gastos) counts toward the total batch investment.
 */
export function computeCost(input: CostInput): CostBreakdown {
  let materialSpend = 0;
  let materialPerPiece = 0;
  let batchPieces = 0;

  switch (input.purchaseMode) {
    case 'piece': {
      materialPerPiece = input.materialCost !== undefined ? input.materialCost : (input.manualCostPerPiece || 0);
      batchPieces = input.batchPieces || 1;
      materialSpend = materialPerPiece * batchPieces;
      break;
    }
    case 'pack':
    case 'case': {
      const totalPrice = input.materialCost !== undefined ? input.materialCost : (input.packTotalPrice || 0);
      const itemCount = input.packItemCount || 0;
      materialPerPiece = itemCount > 0 ? totalPrice / itemCount : 0;
      batchPieces = itemCount;
      materialSpend = totalPrice;
      break;
    }
    case 'kilo':
    case 'liter': {
      const totalPrice = input.materialCost !== undefined ? input.materialCost : (input.bulkTotalPrice || 0);
      const totalQuantity = input.bulkQuantity || 0;
      const portionSize = input.bulkPortionSize || 0;

      // The piece count is derived: total quantity / portion size
      const piecesYielded = portionSize > 0 ? Math.floor(totalQuantity / portionSize) : (input.batchPieces || 0);

      materialPerPiece = piecesYielded > 0 ? totalPrice / piecesYielded : 0;
      batchPieces = piecesYielded;
      materialSpend = totalPrice;
      break;
    }
  }

  const laborCostPerBatch = input.laborCostPerBatch || 0;
  const laborCostPerPiece = batchPieces > 0 ? laborCostPerBatch / batchPieces : 0;
  const overheadPerPiece = input.dagdagGastosPerPiece || 0;

  // Base puhunan per piece = material cost + labor cost
  const puhunan = materialPerPiece + laborCostPerPiece;
  const totalCostPerPiece = puhunan + overheadPerPiece;

  const batchLaborSpend = laborCostPerBatch;
  const batchOverheadSpend = overheadPerPiece * batchPieces;
  const batchTotalInvestment = materialSpend + batchLaborSpend + batchOverheadSpend;

  return {
    materialCostPerPiece: round2(materialPerPiece),
    laborCostPerPiece: round2(laborCostPerPiece),
    overheadPerPiece: round2(overheadPerPiece),
    puhunan: round2(puhunan),
    dagdagGastosPerPiece: round2(overheadPerPiece),
    totalCostPerPiece: round2(totalCostPerPiece),
    batchPieces,
    batchMaterialSpend: round2(materialSpend),
    batchLaborSpend: round2(batchLaborSpend),
    batchOverheadSpend: round2(batchOverheadSpend),
    batchTotalInvestment: round2(batchTotalInvestment),
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

// ----------------------------------------------------
// Philippine Regional Minimum Wage Presets (DOLE NWPC)
// ----------------------------------------------------
export interface RegionalWagePreset {
  id: string;
  region: string;
  shortName: string;
  dailyRate: number; // in PHP for non-agricultural 8-hour day
  standardHours: number; // 8 hours standard work day
  hourlyRate: number; // dailyRate / standardHours
  description: string;
}

/**
 * Minimum wage rates sourced in accordance with Philippine DOLE NWPC wage orders:
 * NCR: ₱645/day (₱80.63/hr)
 * Region 4-A (CALABARZON): ₱520/day (₱65.00/hr)
 * Region 3 (Central Luzon): ₱500/day (₱62.50/hr)
 * Region 7 (Central Visayas): ₱468/day (₱58.50/hr)
 * Region 6 (Western Visayas): ₱480/day (₱60.00/hr)
 * Region 11 (Davao Region): ₱481/day (₱60.13/hr)
 * Provincial / Other Regions: ₱435/day (₱54.38/hr)
 */
export const PHILIPPINE_REGIONAL_WAGES: RegionalWagePreset[] = [
  {
    id: 'ncr',
    region: 'NCR (Metro Manila)',
    shortName: 'NCR',
    dailyRate: 645,
    standardHours: 8,
    hourlyRate: 80.625,
    description: 'Metro Manila: Manila, QC, Taguig, Makati, Pasig, etc.',
  },
  {
    id: 'region4a',
    region: 'Region 4-A (CALABARZON)',
    shortName: 'CALABARZON',
    dailyRate: 520,
    standardHours: 8,
    hourlyRate: 65.0,
    description: 'Cavite, Laguna, Batangas, Rizal, Quezon',
  },
  {
    id: 'region3',
    region: 'Region 3 (Central Luzon)',
    shortName: 'Central Luzon',
    dailyRate: 500,
    standardHours: 8,
    hourlyRate: 62.5,
    description: 'Bulacan, Pampanga, Tarlac, Bataan, Nueva Ecija, Zambales',
  },
  {
    id: 'region7',
    region: 'Region 7 (Central Visayas)',
    shortName: 'Central Visayas',
    dailyRate: 468,
    standardHours: 8,
    hourlyRate: 58.5,
    description: 'Cebu, Bohol, Siquijor',
  },
  {
    id: 'region6',
    region: 'Region 6 (Western Visayas)',
    shortName: 'Western Visayas',
    dailyRate: 480,
    standardHours: 8,
    hourlyRate: 60.0,
    description: 'Iloilo, Bacolod, Negros Occidental, Aklan, Antique, Capiz',
  },
  {
    id: 'region11',
    region: 'Region 11 (Davao Region)',
    shortName: 'Davao',
    dailyRate: 481,
    standardHours: 8,
    hourlyRate: 60.125,
    description: 'Davao City, Davao del Sur, Davao del Norte, Davao Oriental',
  },
  {
    id: 'provincial',
    region: 'Provincial / Other Regions',
    shortName: 'Provincial',
    dailyRate: 435,
    standardHours: 8,
    hourlyRate: 54.375,
    description: 'General baseline across other provinces & rural areas',
  },
];

/**
 * Computes batch labor cost given hourly wage, duration in hours, and number of workers.
 * e.g., 2 workers working 1.5 hours at ₱80.62/hr = ₱241.88 batch labor.
 */
export function calculateBatchLabor(
  hourlyRate: number,
  hours: number,
  workersCount: number = 1
): number {
  if (hourlyRate <= 0 || hours <= 0 || workersCount <= 0) return 0;
  return round2(hourlyRate * hours * workersCount);
}

/**
 * Matches user's entered location text against Philippine regional wage presets.
 */
export function suggestRegionalWage(location?: string | null): RegionalWagePreset {
  if (!location) return PHILIPPINE_REGIONAL_WAGES[0]; // Default to NCR

  const loc = location.toLowerCase();

  if (
    loc.includes('ncr') ||
    loc.includes('manila') ||
    loc.includes('quezon') ||
    loc.includes('makati') ||
    loc.includes('taguig') ||
    loc.includes('pasig') ||
    loc.includes('caloocan') ||
    loc.includes('mandaluyong') ||
    loc.includes('marikina') ||
    loc.includes('pasay') ||
    loc.includes('valenzuela') ||
    loc.includes('las pinas') ||
    loc.includes('paranaque') ||
    loc.includes('muntinlupa')
  ) {
    return PHILIPPINE_REGIONAL_WAGES[0];
  }

  if (
    loc.includes('cavite') ||
    loc.includes('laguna') ||
    loc.includes('batangas') ||
    loc.includes('rizal') ||
    loc.includes('quezon prov') ||
    loc.includes('calabarzon') ||
    loc.includes('antipolo') ||
    loc.includes('dasma') ||
    loc.includes('bacoor') ||
    loc.includes('imus') ||
    loc.includes('calamba') ||
    loc.includes('sta rosa')
  ) {
    return PHILIPPINE_REGIONAL_WAGES[1];
  }

  if (
    loc.includes('bulacan') ||
    loc.includes('pampanga') ||
    loc.includes('tarlac') ||
    loc.includes('bataan') ||
    loc.includes('nueva ecija') ||
    loc.includes('zambales') ||
    loc.includes('angeles') ||
    loc.includes('san fernando')
  ) {
    return PHILIPPINE_REGIONAL_WAGES[2];
  }

  if (loc.includes('cebu') || loc.includes('bohol') || loc.includes('mandaue') || loc.includes('lapu-lapu')) {
    return PHILIPPINE_REGIONAL_WAGES[3];
  }

  if (loc.includes('iloilo') || loc.includes('bacolod') || loc.includes('negros') || loc.includes('aklan') || loc.includes('boracay')) {
    return PHILIPPINE_REGIONAL_WAGES[4];
  }

  if (loc.includes('davao') || loc.includes('tagum')) {
    return PHILIPPINE_REGIONAL_WAGES[5];
  }

  return PHILIPPINE_REGIONAL_WAGES[6]; // Provincial
}

