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

// Maps a Likhora supplier category chip to how it should be searched.
// Queries are phrased to target human-food/retail suppliers specifically —
// generic phrasing like "meat wholesale supplier" fuzzy-matches livestock
// feed/agrivet stores in Google's text search, which are never relevant to
// any of Likhora's supported MSME business types.
export const CATEGORY_SEARCH_MAP: Record<string, { types?: string[]; textQuery?: string }> = {
  'Malls & Supermarkets': { types: ['shopping_mall', 'supermarket', 'department_store'] },
  'Rice & Grains': { textQuery: 'bigasan rice retailer wholesale for restaurants' },
  Meat: { textQuery: 'fresh meat and poultry supplier for restaurants' },
  Packaging: { textQuery: 'food packaging and takeout container supplier' },
  Ingredients: { textQuery: 'food ingredients and condiments wholesale supplier' },
  Equipment: { textQuery: 'kitchen and business equipment supplier' },
  Nearby: { types: ['supermarket', 'grocery_store', 'convenience_store', 'shopping_mall'] },
  All: { types: ['supermarket', 'grocery_store', 'shopping_mall'] },
};

// Shop/business-type keywords that never fit any of Likhora's supported
// MSME categories (food stalls, sari-sari stores, online shops, services,
// clothing, delivery) — filtered out everywhere, regardless of which
// category chip is active or which data source found the listing.
const UNIVERSALLY_IRRELEVANT_KEYWORDS = [
  'poultry supply', 'poultry and feeds', 'feeds supply', 'feed store', 'livestock',
  'veterinary', 'agrivet', 'agricultural supply', 'fertilizer', 'pesticide', 'farm supply',
  'pet shop', 'pet store', 'construction supply', 'hardware', 'auto parts', 'funeral', 'mortuary',
];

export const isSupplierRelevant = (name: string): boolean => {
  const lower = name.toLowerCase();
  return !UNIVERSALLY_IRRELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
};

// Which chip-categories to search by default (the "All"/"Nearby" browse
// view) for a given onboarding business type — so a Carinderia's default
// results lead with food/ingredient suppliers, not whatever generic
// "wholesale" happens to be nearby.
export interface SupplierProfile {
  categories: string[];
}

const FOOD_BUSINESS_PROFILE: SupplierProfile = {
  categories: ['Rice & Grains', 'Meat', 'Ingredients', 'Packaging', 'Malls & Supermarkets'],
};

const BUSINESS_SUPPLIER_PROFILES: Record<string, SupplierProfile> = {
  Carinderia: FOOD_BUSINESS_PROFILE,
  'Food Stall': FOOD_BUSINESS_PROFILE,
  'Sari-sari Store': { categories: ['Malls & Supermarkets', 'Ingredients', 'Packaging'] },
  'Online Shop': { categories: ['Packaging', 'Equipment', 'Malls & Supermarkets'] },
  Services: { categories: ['Equipment', 'Packaging', 'Malls & Supermarkets'] },
  'Clothing & RTW': { categories: ['Packaging', 'Equipment', 'Malls & Supermarkets'] },
  'Delivery / Rides': { categories: ['Equipment', 'Malls & Supermarkets'] },
};

const DEFAULT_SUPPLIER_PROFILE: SupplierProfile = {
  categories: ['Malls & Supermarkets', 'Ingredients', 'Packaging', 'Equipment'],
};

export const getSupplierProfileForBusiness = (businessType?: string): SupplierProfile =>
  (businessType && BUSINESS_SUPPLIER_PROFILES[businessType]) || DEFAULT_SUPPLIER_PROFILE;
