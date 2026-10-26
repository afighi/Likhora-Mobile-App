// Google Places API (New) integration for Likhora AI's Suppliers tab.
//
// Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to be set (see .env.example).
// The key is bundled into the client app, which is the standard/supported
// way to use Places API in mobile apps — unlike a server-only secret (e.g.
// the Anthropic key in claude.ts), Google Places keys are designed to be
// restricted per-platform (Android package + SHA-1, iOS bundle ID, or HTTP
// referrer for web) directly in Google Cloud Console, which is the actual
// abuse control. See README for the exact restriction steps.
//
// Every export here degrades gracefully to an empty result when the key is
// missing, so the app keeps working on the free OpenStreetMap fallback path
// in suppliers.tsx if this hasn't been configured.

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const PLACES_BASE = 'https://places.googleapis.com/v1';

export interface PlaceReview {
  authorName?: string;
  rating?: number;
  text?: string;
  relativeTime?: string;
}

export interface GooglePlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  phone: string | null;
  types: string[];
  photoUrl: string | null;
  googleMapsUri: string | null;
  reviews?: PlaceReview[];
}

export const isGooglePlacesConfigured = (): boolean => Boolean(GOOGLE_PLACES_API_KEY);

// Resolve a Places photo resource name (e.g. "places/XXX/photos/YYY") to a
// direct, displayable image URL via the Photo Media endpoint.
const resolvePhotoUrl = (photoName?: string, maxWidthPx = 480): string | null => {
  if (!photoName || !GOOGLE_PLACES_API_KEY) return null;
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${GOOGLE_PLACES_API_KEY}`;
};

const mapPlace = (place: any): GooglePlaceResult => ({
  id: place.id,
  name: place.displayName?.text || 'Unnamed business',
  address: place.formattedAddress || '',
  lat: place.location?.latitude,
  lng: place.location?.longitude,
  rating: typeof place.rating === 'number' ? place.rating : null,
  userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
  priceLevel: place.priceLevel || null,
  phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
  types: place.types || [],
  photoUrl: resolvePhotoUrl(place.photos?.[0]?.name),
  googleMapsUri: place.googleMapsUri || null,
  reviews: Array.isArray(place.reviews)
    ? place.reviews.slice(0, 3).map((r: any) => ({
        authorName: r.authorAttribution?.displayName || 'Customer',
        rating: typeof r.rating === 'number' ? r.rating : undefined,
        text: r.text?.text || r.originalText?.text || '',
        relativeTime: r.relativePublishTimeDescription || '',
      }))
    : [],
});

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.types',
  'places.photos',
  'places.googleMapsUri',
  'places.reviews',
].join(',');

/**
 * Nearby Search — for well-defined Google place types (supermarkets, malls,
 * grocery/convenience stores). Most accurate + fastest for these categories.
 */
export const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  includedTypes: string[],
  radiusMeters = 15000
): Promise<GooglePlaceResult[]> => {
  if (!GOOGLE_PLACES_API_KEY) return [];

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.places) ? data.places.map(mapPlace) : [];
  } catch (e) {
    console.warn('Google Places nearby search notice:', e);
    return [];
  }
};

/**
 * Text Search — for categories Google's typed Nearby Search doesn't cover
 * well (rice/grains wholesalers, meat suppliers, packaging suppliers), biased
 * toward the user's location.
 */
export const searchTextPlaces = async (
  textQuery: string,
  lat: number,
  lng: number,
  radiusMeters = 15000
): Promise<GooglePlaceResult[]> => {
  if (!GOOGLE_PLACES_API_KEY) return [];

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20,
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.places) ? data.places.map(mapPlace) : [];
  } catch (e) {
    console.warn('Google Places text search notice:', e);
    return [];
  }
};

// Maps a supplier category chip to how it should be searched. Queries are
// phrased for the specific trade rather than generic "wholesale", which
// fuzzy-matches whatever large store happens to be nearby.
export interface SupplierSearchConfig {
  types?: string[];
  textQuery?: string;
}

export const CATEGORY_SEARCH_MAP: Record<string, SupplierSearchConfig> = {
  // --- general ---
  'Malls & Supermarkets': { types: ['shopping_mall', 'supermarket', 'department_store'] },
  Packaging: { textQuery: 'packaging and container supplier' },
  Equipment: { textQuery: 'business equipment supplier' },

  // --- food trades ---
  'Rice & Grains': { textQuery: 'bigasan rice retailer wholesale for restaurants' },
  Meat: { textQuery: 'fresh meat and poultry supplier for restaurants' },
  Ingredients: { textQuery: 'food ingredients and condiments wholesale supplier' },
  'Food Packaging': { textQuery: 'food packaging and takeout container supplier' },
  'Kitchen Equipment': { textQuery: 'commercial kitchen equipment supplier' },

  // --- service trades: these are the categories the old, food-only map had
  //     no way to express, which is why a pet groomer saw only groceries ---
  'Pet Supplies': { textQuery: 'pet grooming supplies and pet products distributor' },
  'Salon & Beauty': { textQuery: 'salon and beauty supplies distributor' },
  'Laundry Supplies': { textQuery: 'laundry detergent and supplies wholesale' },
  'Cleaning Supplies': { textQuery: 'janitorial and cleaning supplies supplier' },
  'Tools & Hardware': { textQuery: 'hardware and tools store' },
  'Printing & Signage': { textQuery: 'printing and signage services supplier' },

  // --- goods trades ---
  'Fabric & Sewing': { textQuery: 'fabric and sewing supplies store' },
  'Clothing Wholesale': { textQuery: 'ukay bale and RTW clothing wholesaler' },
  Electronics: { textQuery: 'electronics and gadget parts supplier' },

  // --- browse views ---
  Nearby: { types: ['supermarket', 'grocery_store', 'convenience_store', 'shopping_mall'] },
  All: { types: ['supermarket', 'grocery_store', 'shopping_mall'] },
};

// Business types that never fit ANY Likhora user. Anything domain-specific
// (pet shops, hardware, agrivet) belongs in a profile's allowedKeywords
// instead — a pet shop is noise to a carinderia and essential to a groomer,
// so it cannot be a global rule.
const UNIVERSALLY_IRRELEVANT_KEYWORDS = [
  'funeral', 'mortuary', 'crematorium', 'cemetery',
  'casino', 'pawnshop', 'lending', 'money changer',
];

// Blocked for most businesses, but unblocked by a profile that needs them.
const DOMAIN_KEYWORDS = [
  'poultry supply', 'poultry and feeds', 'feeds supply', 'feed store', 'livestock',
  'veterinary', 'agrivet', 'agricultural supply', 'fertilizer', 'pesticide', 'farm supply',
  'pet shop', 'pet store', 'pet supply', 'grooming',
  'construction supply', 'hardware', 'auto parts', 'motor parts',
  'salon supply', 'beauty supply', 'laundry',
];

export interface SupplierProfile {
  /** Chip labels, in the order they should appear. */
  categories: string[];
  /** Category -> how to search for it. Custom businesses get generated entries. */
  searchMap: Record<string, SupplierSearchConfig>;
  /** Free-text used by the Nominatim fallback when browsing with no query. */
  browseKeyword: string;
  /** Domain keywords this business legitimately needs, despite the blocklist. */
  allowedKeywords: string[];
  /** One-line guidance shown above the results. */
  tip: string;
}

const buildProfile = (
  categories: string[],
  browseKeyword: string,
  allowedKeywords: string[],
  tip: string
): SupplierProfile => ({
  categories,
  searchMap: CATEGORY_SEARCH_MAP,
  browseKeyword,
  allowedKeywords,
  tip,
});

const FOOD_PROFILE = buildProfile(
  ['Rice & Grains', 'Meat', 'Ingredients', 'Food Packaging', 'Kitchen Equipment', 'Malls & Supermarkets'],
  'palengke wet market wholesale grocery supplier',
  [],
  'For your food business, start with the wet market and bagsakan suppliers. Compare fresh ingredient prices before committing to one.'
);

const BUSINESS_SUPPLIER_PROFILES: Record<string, SupplierProfile> = {
  'Carinderia / Food Stall': FOOD_PROFILE,

  'Sari-sari Store': buildProfile(
    ['Malls & Supermarkets', 'Ingredients', 'Rice & Grains', 'Packaging'],
    'wholesale grocery distributor supermarket',
    [],
    'For your store, prioritise wholesalers with consistent stock and transparent pakyawan pricing.'
  ),

  'Online Selling': buildProfile(
    ['Packaging', 'Electronics', 'Clothing Wholesale', 'Malls & Supermarkets'],
    'wholesale supplier packaging courier',
    [],
    'For online selling, packaging and a reliable stock source matter more than proximity — compare shipping terms too.'
  ),

  // The case the old map could not express at all.
  'Serbisyo / Services': buildProfile(
    ['Pet Supplies', 'Salon & Beauty', 'Laundry Supplies', 'Cleaning Supplies', 'Tools & Hardware', 'Equipment'],
    'supplies and equipment supplier for service business',
    [
      'pet shop', 'pet store', 'pet supply', 'grooming', 'veterinary',
      'salon supply', 'beauty supply', 'laundry',
      'hardware', 'construction supply', 'auto parts', 'motor parts',
    ],
    'For a service business, look for consumables and equipment suppliers — the things you use up per job, and the tools you work with.'
  ),

  // Offline fallback only — when Khora is reachable, the "what do you mainly
  // buy and sell" answer drives a search aimed at that specific trade.
  'Buy & Sell / Reselling': buildProfile(
    ['Clothing Wholesale', 'Electronics', 'Tools & Hardware', 'Packaging', 'Malls & Supermarkets'],
    'wholesale supplier secondhand and surplus dealer',
    ['auto parts', 'motor parts', 'hardware'],
    'For buy and sell, build relationships with 2-3 sources so you are never captive to one price — and verify ownership papers on anything that has them.'
  ),
};

// business_type values stored before the five-profile rework.
const LEGACY_SUPPLIER_ALIASES: Record<string, string> = {
  Carinderia: 'Carinderia / Food Stall',
  'Food Stall': 'Carinderia / Food Stall',
  'Online Shop': 'Online Selling',
  Services: 'Serbisyo / Services',
  'Clothing & RTW': 'Buy & Sell / Reselling',
  'Buy & Sell / RTW': 'Buy & Sell / Reselling',
  'Delivery / Rides': 'Serbisyo / Services',
};

const GENERIC_PROFILE = buildProfile(
  ['Malls & Supermarkets', 'Equipment', 'Packaging'],
  'wholesale supplier',
  [],
  'Start with the closest verified supplier, then compare their current price range before choosing.'
);

/**
 * Builds a profile for a business type we have no hand-written entry for —
 * a custom one the user typed, like "pet grooming" or "bike repair".
 *
 * The business type is used verbatim in the search phrase, so the results are
 * about THAT trade rather than whatever generic wholesaler is nearby. Its own
 * words also unblock the domain keywords it needs: "pet grooming" contains
 * "pet", so pet shops stop being filtered out as noise.
 */
const buildCustomProfile = (businessType: string): SupplierProfile => {
  const trade = businessType.trim();

  const suppliesLabel = 'Supplies';
  const equipmentLabel = 'Equipment';

  return {
    categories: [suppliesLabel, equipmentLabel, 'Packaging', 'Malls & Supermarkets'],
    searchMap: {
      ...CATEGORY_SEARCH_MAP,
      [suppliesLabel]: { textQuery: `${trade} supplies wholesale supplier` },
      [equipmentLabel]: { textQuery: `${trade} equipment and tools supplier` },
    },
    browseKeyword: `${trade} supplies supplier`,
    // No domain filtering for a custom trade. The blocklist exists to clean up
    // broad, grocery-shaped queries; here the query is already specific to the
    // trade, so precision comes from the search phrase. Keyword filtering at
    // this point removes the very shops the trade needs and cannot know it —
    // "auto parts" reads as noise unless you happen to be a car wash, and a
    // word-overlap rule does not catch it because "car" is not "auto".
    allowedKeywords: DOMAIN_KEYWORDS,
    tip: `For your ${trade} business, look for suppliers of the materials you use up per job, plus the equipment you work with.`,
  };
};

export const getSupplierProfileForBusiness = (businessType?: string): SupplierProfile => {
  if (!businessType?.trim()) return GENERIC_PROFILE;

  const direct = BUSINESS_SUPPLIER_PROFILES[businessType];
  if (direct) return direct;

  const aliased = LEGACY_SUPPLIER_ALIASES[businessType];
  if (aliased && BUSINESS_SUPPLIER_PROFILES[aliased]) return BUSINESS_SUPPLIER_PROFILES[aliased];

  return buildCustomProfile(businessType);
};

/**
 * Whether a listing is worth showing this particular business. The blocklist
 * is deliberately business-aware: filtering "pet shop" globally is what made
 * a pet groomer's supplier list useless.
 */
export const isSupplierRelevant = (name: string, avoid: string[] = []): boolean => {
  const lower = name.toLowerCase();

  // Only universally-junk listings are filtered here. Anything domain-specific
  // is decided per business by Khora (services/supplierAdvisor.ts) and arrives
  // in `avoid` — a keyword blocklist in this file cannot know whether "auto
  // parts" is noise or the whole point.
  if (UNIVERSALLY_IRRELEVANT_KEYWORDS.some((keyword) => lower.includes(keyword))) return false;

  return !avoid.some((keyword) => keyword && lower.includes(keyword));
};
