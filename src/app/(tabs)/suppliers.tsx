import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import {
  Bell,
  Search,
  MapPin,
  Navigation,
  Sparkles,
  Phone,
  Star,
  Plus,
  Check,
  X,
  Store,
  ImageOff,
  LocateFixed,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  ImageIcon
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchSuppliersFromSupabase, SupplierItem } from '@/services/supabase';
import { AppLogo } from '@/components/ui/AppLogo';
import { getCurrentDeviceCoords, geocodePhilippineLocation } from '@/services/location';
import {
  isGooglePlacesConfigured,
  searchNearbyPlaces,
  searchTextPlaces,
  GooglePlaceResult,
  isSupplierRelevant,
} from '@/services/places';
import { getAISupplierProfile, SupplierProfileResult } from '@/services/supplierAdvisor';

// Google Places (New) priceLevel enum -> a compact ₱ symbol for the UI.
const GOOGLE_PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '₱',
  PRICE_LEVEL_MODERATE: '₱₱',
  PRICE_LEVEL_EXPENSIVE: '₱₱₱',
  PRICE_LEVEL_VERY_EXPENSIVE: '₱₱₱₱',
};

// Broad Metro Manila center — used only as a last-resort map center when
// GPS is denied AND the user's saved location can't be geocoded, so the
// list is never silently pinned to the wrong specific city.
const PHILIPPINES_FALLBACK_COORDS = { lat: 14.5995, lng: 120.9842 };

// Calculate Haversine distance in km
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format detailed street address from OSM tags or Nominatim display string
const formatDetailedAddress = (tags: any, fallbackCity: string, fullDisplayName?: string): string => {
  if (tags) {
    const housenumber = tags['addr:housenumber'] || '';
    const street = tags['addr:street'] || tags['addr:place'] || '';
    const suburb = tags['addr:suburb'] || tags['addr:district'] || tags['addr:neighbourhood'] || '';
    const city = tags['addr:city'] || tags['addr:municipality'] || fallbackCity;
    const province = tags['addr:province'] || tags['addr:state'] || '';

    const parts = [housenumber, street, suburb, city, province].filter(Boolean);
    if (parts.length >= 2) {
      return parts.join(', ');
    }
  }

  if (fullDisplayName) {
    const segs = fullDisplayName.split(',').map(s => s.trim());
    return segs.slice(0, 4).join(', ');
  }

  return `${fallbackCity}, Philippines`;
};

export default function SuppliersTab() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { unreadCount } = useNotification();

  const [loading, setLoading] = useState(true);
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [addedPlans, setAddedPlans] = useState<string[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<SupplierItem | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

  // Client-side refinement filters, applied on top of whatever the active
  // category/search already fetched — these don't trigger a re-fetch.
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null); // null = any distance
  const [minRating, setMinRating] = useState<number | null>(null); // null = any rating
  const [priceLevels, setPriceLevels] = useState<string[]>([]); // empty = any price
  const [photoOnly, setPhotoOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  const activeFilterCount =
    (maxDistanceKm !== null ? 1 : 0) +
    (minRating !== null ? 1 : 0) +
    (priceLevels.length > 0 ? 1 : 0) +
    (photoOnly ? 1 : 0) +
    (sortBy !== 'distance' ? 1 : 0);

  const resetFilters = () => {
    setMaxDistanceKm(null);
    setMinRating(null);
    setPriceLevels([]);
    setPhotoOnly(false);
    setSortBy('distance');
  };

  const togglePriceLevel = (level: string) => {
    setPriceLevels((prev) => (prev.includes(level) ? prev.filter((p) => p !== level) : [...prev, level]));
  };

  // Coordinates are only used after we've actually resolved a real location
  // for this user — device GPS first, then their saved onboarding location
  // geocoded to real coordinates, never a hardcoded guess.
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'device' | 'profile' | 'approximate'>('profile');
  const [resolvingLocation, setResolvingLocation] = useState(true);
  // 'auto' = try device GPS first, fall back to saved profile location
  // (the original default behavior). Explicitly picking 'device' or
  // 'profile' pins to that source so a live GPS reading can't silently
  // override a location you deliberately want to browse suppliers near.
  const [locationMode, setLocationMode] = useState<'auto' | 'device' | 'profile'>('auto');

  // Dynamically parse user's location from onboarding answers saved in Supabase profile
  const getUserLocationDisplay = (): { displayLocation: string; queryCity: string; province: string } => {
    if (!userProfile?.location) {
      return { displayLocation: 'Bulacan', queryCity: 'Bulacan', province: 'Bulacan' };
    }

    const raw = userProfile.location;

    // Format 1: "Region | Province | City | Barangay"
    if (raw.includes('|')) {
      const parts = raw.split('|').map(s => s.trim());
      const region = parts[0] || '';
      const province = parts[1] || 'Bulacan';
      const city = parts[2] || province;
      const barangay = parts[3] || '';

      let display = city || province || region;
      if (barangay && city) {
        display = `${barangay}, ${city}`;
      }

      return {
        displayLocation: display,
        queryCity: city || province,
        province: province || city,
      };
    }

    // Format 2: "Barangay, City, Province"
    if (raw.includes(',')) {
      const parts = raw.split(',').map(s => s.trim());
      return {
        displayLocation: parts.slice(0, 2).join(', '),
        queryCity: parts[1] || parts[0] || 'Bulacan',
        province: parts[2] || parts[1] || 'Bulacan',
      };
    }

    return {
      displayLocation: raw,
      queryCity: raw,
      province: raw,
    };
  };

  const { displayLocation, queryCity, province } = getUserLocationDisplay();
  // Which suppliers this business needs is decided by Khora from the user's
  // actual business type, not from a lookup table — a table only knows the
  // trades someone thought to add, and answers "supermarket" for every one it
  // does not. Built-in profiles remain only as an offline fallback.
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfileResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Read off the profile once so the memo/effect deps below are the exact
  // values they use, not the whole userProfile object.
  const businessTypeValue = userProfile?.business_type;
  const businessNameValue = userProfile?.business_name;
  const businessLocation = userProfile?.location;
  const onboardingDraft = userProfile?.onboarding_draft;

  const serviceDetail = useMemo(() => {
    try {
      const draft = onboardingDraft ? JSON.parse(onboardingDraft) : null;
      // The answers from onboarding step 4 describe the trade far more
      // precisely than a broad category like "Serbisyo / Services" can.
      const answers: string[] = Object.values(draft?.extraAnswers || {});
      return [businessNameValue, ...answers].filter(Boolean).join(', ') || null;
    } catch {
      return businessNameValue || null;
    }
  }, [onboardingDraft, businessNameValue]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      const profile = await getAISupplierProfile(businessTypeValue, {
        detail: serviceDetail,
        location: businessLocation,
      });
      if (!cancelled) {
        setSupplierProfile(profile);
        setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [businessTypeValue, serviceDetail, businessLocation]);
  const supplierRecommendation =
    supplierProfile?.tip || 'Finding the right suppliers for your business...';
  // Chips are whatever Khora decided this trade buys from.
  const supplierCategories = ['All', 'Nearby', ...(supplierProfile?.categories || []).map((c) => c.label)];

  // Resolve the user's coordinates according to locationMode:
  // - 'auto' (default): device GPS first, falling back to their saved
  //   onboarding location geocoded to real lat/lng, then a broad fallback.
  // - 'device' / 'profile': the user explicitly picked one via the toggle
  //   below, so that source is used on its own — a live GPS reading can no
  //   longer silently override a location they deliberately chose to browse.
  useEffect(() => {
    let cancelled = false;

    const resolveViaDevice = async (): Promise<boolean> => {
      const deviceCoords = await getCurrentDeviceCoords();
      if (cancelled) return false;
      if (deviceCoords) {
        setUserCoords(deviceCoords);
        setLocationSource('device');
        return true;
      }
      return false;
    };

    const resolveViaProfile = async () => {
      const geocoded = await geocodePhilippineLocation(`${queryCity}, ${province}`);
      if (cancelled) return;
      if (geocoded) {
        setUserCoords(geocoded);
        setLocationSource('profile');
      } else {
        setUserCoords(PHILIPPINES_FALLBACK_COORDS);
        setLocationSource('approximate');
      }
    };

    const resolveLocation = async () => {
      setResolvingLocation(true);

      if (locationMode === 'profile') {
        await resolveViaProfile();
      } else if (locationMode === 'device') {
        const gotDevice = await resolveViaDevice();
        if (!gotDevice && !cancelled) {
          // They explicitly asked for device location but it's unavailable
          // (denied permission, no GPS, etc.) — fall back so the screen
          // still works, but be upfront that it's not what was asked for.
          Alert.alert(
            'Location access unavailable',
            'Could not get your current device location. Showing your saved business location instead.'
          );
          await resolveViaProfile();
        }
      } else {
        // auto
        const gotDevice = await resolveViaDevice();
        if (!gotDevice && !cancelled) {
          await resolveViaProfile();
        }
      }

      if (!cancelled) setResolvingLocation(false);
    };

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [queryCity, province, locationMode]);

  // Fetch REAL Verified Commercial Businesses, Malls, Supermarkets & Wholesalers via OpenStreetMap Overpass API
  const fetchRealOverpassSuppliers = async (lat: number, lng: number, cityName: string): Promise<SupplierItem[]> => {
    const overpassQuery = `
      [out:json][timeout:10];
      (
        nwr["shop"="supermarket"](around:15000,${lat},${lng});
        nwr["shop"="mall"](around:15000,${lat},${lng});
        nwr["shop"="grocery"](around:15000,${lat},${lng});
        nwr["amenity"="marketplace"](around:15000,${lat},${lng});
        nwr["shop"="wholesale"](around:15000,${lat},${lng});
      );
      out center tags 25;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(overpassQuery),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.elements && data.elements.length > 0) {
          const items: SupplierItem[] = data.elements.map((el: any, idx: number) => {
            const rawName = el.tags?.name || el.tags?.brand || el.tags?.operator || 'Unnamed mapped business';
            const shopType = el.tags?.shop || el.tags?.amenity || el.tags?.building || 'wholesale';
            const supplierLat = el.lat ?? el.center?.lat;
            const supplierLng = el.lon ?? el.center?.lon;
            
            // Default to 'Nearby' (not a specific category) for anything
            // that doesn't clearly match — OSM's generic `shop=wholesale`
            // tag covers everything from rice traders to hardware, so
            // guessing a specific category for it would mislabel results.
            let category = 'Nearby';
            if (shopType.includes('mall') || shopType.includes('supermarket') || shopType.includes('grocery') || shopType.includes('department_store')) {
              category = 'Malls & Supermarkets';
            } else if (shopType.includes('butcher') || shopType.includes('meat')) {
              category = 'Meat';
            } else if (shopType.includes('bakery')) {
              category = 'Packaging';
            } else if (shopType.includes('marketplace')) {
              category = 'Rice & Grains';
            }

            const distKm = getDistanceFromLatLonInKm(lat, lng, supplierLat, supplierLng);
            const detailedAddress = formatDetailedAddress(el.tags, cityName);

            return {
              id: `op-${el.id || idx}`,
              name: rawName,
              category,
              rating: '',
              distance: `${distKm.toFixed(1)} km`,
              location: detailedAddress,
              tags: [
                shopType.includes('mall') || shopType.includes('supermarket')
                  ? 'Shopping Mall & Supermarket'
                  : 'Wholesale Market',
                'OpenStreetMap location'
              ],
              price_level: '',
              price_range: 'Not published by this listing',
              phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
              lat: supplierLat,
              lng: supplierLng,
            };
          });

          // SORT STRICTLY BY NEAREST DISTANCE ASCENDING
          items.sort((a: SupplierItem, b: SupplierItem) => parseFloat(a.distance) - parseFloat(b.distance));
          return items;
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
    return [];
  };

  // Helper function to filter items by category & search query
  const filterSuppliers = (items: SupplierItem[], cat: string, query: string): SupplierItem[] => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      // Never show listings that don't fit any of Likhora's supported MSME
      // business types (feed stores, veterinary suppliers, hardware, etc.),
      // regardless of which source found them or which category is active.
      if (!isSupplierRelevant(item.name, supplierProfile?.avoid || [])) return false;

      const matchCat = cat === 'All' || cat === 'Nearby' || item.category === cat;
      if (!matchCat) return false;
      if (!q) return true;
      const nameMatch = item.name?.toLowerCase().includes(q);
      const locMatch = item.location?.toLowerCase().includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);
      const tagMatch = item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes(q));
      const priceMatch = item.price_range?.toLowerCase().includes(q);
      return nameMatch || locMatch || catMatch || tagMatch || priceMatch;
    });
  };

  // Map a Google Places (New) result to this app's SupplierItem shape.
  const mapGooglePlaceToSupplier = (
    place: GooglePlaceResult,
    category: string,
    fromLat: number,
    fromLng: number
  ): SupplierItem => ({
    id: `gp-${place.id}`,
    name: place.name,
    category,
    rating: place.rating ?? '',
    distance: `${getDistanceFromLatLonInKm(fromLat, fromLng, place.lat, place.lng).toFixed(1)} km`,
    location: place.address || `${displayLocation}, Philippines`,
    tags: [
      String(category),
      place.userRatingCount ? `${place.userRatingCount} Google reviews` : 'Google Places listing',
    ],
    price_level: place.priceLevel ? GOOGLE_PRICE_LEVEL_MAP[place.priceLevel] || '' : '',
    price_range: place.priceLevel ? GOOGLE_PRICE_LEVEL_MAP[place.priceLevel] : 'Not published by this listing',
    phone: place.phone || '',
    lat: place.lat,
    lng: place.lng,
    image_url: place.photoUrl || undefined,
  });

  // Categorize a free-text Google Places search result (used when the user
  // is actively searching rather than browsing a specific category chip).
  const categorizeByGoogleTypes = (types: string[]): string => {
    if (types.some((t) => ['shopping_mall', 'department_store', 'supermarket', 'grocery_store', 'convenience_store'].includes(t))) {
      return 'Malls & Supermarkets';
    }
    return 'Nearby';
  };

  // Fetch REAL, photo-rich nearby suppliers via Google Places API (New).
  // This is the most accurate source we have, so it's tried first whenever
  // an API key is configured; every other source below stays as a free
  // fallback for when it isn't.
  const fetchGooglePlacesSuppliers = async (
    lat: number,
    lng: number,
    category: string,
    query: string
  ): Promise<SupplierItem[]> => {
    if (!isGooglePlacesConfigured()) return [];

    let results: SupplierItem[] = [];

    if (query.trim()) {
      const places = await searchTextPlaces(`${query.trim()} supplier`, lat, lng);
      results = places.map((p) => mapGooglePlaceToSupplier(p, categorizeByGoogleTypes(p.types), lat, lng));
    } else {
      const allCategories = supplierProfile?.categories || [];
      const targets =
        category !== 'All' && category !== 'Nearby'
          ? allCategories.filter((c) => c.label === category)
          : allCategories;

      const grouped = await Promise.all(
        targets.map(async (cat) => {
          const config = cat.types ? { types: cat.types } : { textQuery: cat.search };
          if (!config.types && !config.textQuery) return [] as SupplierItem[];
          const places = config.types
            ? await searchNearbyPlaces(lat, lng, config.types)
            : config.textQuery
              ? await searchTextPlaces(config.textQuery, lat, lng)
              : [];
          return places.map((p) => mapGooglePlaceToSupplier(p, cat.label, lat, lng));
        })
      );
      results = grouped.flat();
    }

    // De-duplicate (the same place can surface from more than one category
    // search) and sort nearest-first.
    const seenIds = new Set<string>();
    const deduped = results.filter((s) => {
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    });
    deduped.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    return deduped;
  };

  // Main Live API Fetcher
  const loadSuppliersLive = async () => {
    if (!userCoords) return;
    setLoading(true);
    const activeCoords = userCoords;

    try {
      // 1. Google Places API (New) — real, accurate, photo-rich listings.
      const googleResults = await fetchGooglePlacesSuppliers(activeCoords.lat, activeCoords.lng, activeCategory, searchQuery);
      if (googleResults.length > 0) {
        const filteredGoogle = filterSuppliers(googleResults, activeCategory, searchQuery);
        if (filteredGoogle.length > 0) {
          setSuppliersList(filteredGoogle);
          setLoading(false);
          return;
        }
      }

      // 2. Query Supabase Database
      const { data } = await fetchSuppliersFromSupabase(activeCategory, searchQuery, queryCity);
      if (data && data.length > 0) {
        const mappedDb = data.map((supplier) => ({
          ...supplier,
          distance: supplier.lat && supplier.lng
            ? `${getDistanceFromLatLonInKm(activeCoords.lat, activeCoords.lng, Number(supplier.lat), Number(supplier.lng)).toFixed(1)} km`
            : supplier.distance || '1.0 km',
        })).sort((a: SupplierItem, b: SupplierItem) => parseFloat(a.distance) - parseFloat(b.distance));

        const filteredDb = filterSuppliers(mappedDb, activeCategory, searchQuery);
        if (filteredDb.length > 0) {
          setSuppliersList(filteredDb);
          setLoading(false);
          return;
        }
      }

      // 3. Query Live OpenStreetMap Overpass API around GPS / Fallback Coordinates
      const overpassResults = await fetchRealOverpassSuppliers(activeCoords.lat, activeCoords.lng, queryCity);
      if (overpassResults.length > 0) {
        const filteredOverpass = filterSuppliers(overpassResults, activeCategory, searchQuery);
        if (filteredOverpass.length > 0) {
          setSuppliersList(filteredOverpass);
          setLoading(false);
          return;
        }
      }

      // 4. Fallback Query OpenStreetMap Nominatim Places API
      const keyword = searchQuery.trim()
        ? searchQuery.trim()
        : activeCategory !== 'All' && activeCategory !== 'Nearby'
          ? supplierProfile?.categories.find((c) => c.label === activeCategory)?.search || activeCategory
          : supplierProfile?.browseSearch || 'wholesale supplier';

      const apiRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}+in+${encodeURIComponent(queryCity)}&limit=25`,
        { headers: { 'User-Agent': 'LikhoraApp/1.0' } }
      );

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && apiData.length > 0) {
          const mappedFromApi: SupplierItem[] = apiData.map((item: any, idx: number) => {
            const itemLat = parseFloat(item.lat);
            const itemLng = parseFloat(item.lon);
            const distKm = getDistanceFromLatLonInKm(activeCoords.lat, activeCoords.lng, itemLat, itemLng);
            const isMallOrGrocery = item.display_name.toLowerCase().includes('mall') || 
                                    item.display_name.toLowerCase().includes('supermarket') ||
                                    item.display_name.toLowerCase().includes('grocery');

            return {
              id: item.place_id ? String(item.place_id) : String(idx + 1),
              name: item.display_name.split(',')[0] || `Supplier near ${queryCity}`,
              category: isMallOrGrocery ? 'Malls & Supermarkets' : 'Nearby',
              rating: '',
              distance: `${distKm.toFixed(1)} km`,
              location: formatDetailedAddress(null, queryCity, item.display_name),
              tags: [isMallOrGrocery ? 'Shopping Mall & Supermarket' : 'Mapped place', 'OpenStreetMap result'],
              price_level: '',
              price_range: 'Not published by this listing',
              phone: '',
              lat: itemLat,
              lng: itemLng,
            };
          }).sort((a: SupplierItem, b: SupplierItem) => parseFloat(a.distance) - parseFloat(b.distance));

          const filteredApi = filterSuppliers(mappedFromApi, activeCategory, searchQuery);
          setSuppliersList(filteredApi);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Supplier API fetch notice:', e);
    }

    setSuppliersList([]);
    setLoading(false);
  };

  useEffect(() => {
    // Waiting on the profile matters: fetching before it lands would search
    // with no categories and show a generic list that then swaps underneath.
    if (userCoords && supplierProfile) loadSuppliersLive();
  }, [activeCategory, searchQuery, queryCity, displayLocation, userCoords, supplierProfile]);

  // Refinement filters applied on top of the already-fetched results — no
  // re-fetch needed, so these feel instant.
  const filteredSuppliersList = useMemo(() => {
    let list = suppliersList.filter((item) => {
      if (maxDistanceKm !== null) {
        const km = parseFloat(item.distance);
        if (Number.isNaN(km) || km > maxDistanceKm) return false;
      }
      if (minRating !== null) {
        const rating = typeof item.rating === 'number' ? item.rating : parseFloat(String(item.rating));
        if (Number.isNaN(rating) || rating < minRating) return false;
      }
      if (priceLevels.length > 0 && !priceLevels.includes(item.price_level)) return false;
      if (photoOnly && !item.image_url) return false;
      return true;
    });

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : parseFloat(String(a.rating)) || 0;
        const rb = typeof b.rating === 'number' ? b.rating : parseFloat(String(b.rating)) || 0;
        return rb - ra;
      });
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'distance' is already the fetch pipeline's default sort order.

    return list;
  }, [suppliersList, maxDistanceKm, minRating, priceLevels, photoOnly, sortBy]);

  const toggleAddToPlan = (id: string, name: string) => {
    if (addedPlans.includes(id)) {
      setAddedPlans(addedPlans.filter(p => p !== id));
    } else {
      setAddedPlans([...addedPlans, id]);
      Alert.alert('Added to Plan', `"${name}" has been attached to your active business setup plan.`);
    }
  };

  // Generate HTML for Interactive Leaflet Map with Real Supplier Markers
  // Renders the actual Leaflet map (real OpenStreetMap tiles + real supplier
  // pins). `interactive: false` produces a static, un-pannable/un-zoomable
  // snapshot for the small hero preview card — same real map, just frozen so
  // it doesn't fight the screen's vertical scroll or the popup doesn't
  // auto-open in a cramped space.
  const generateLeafletMapHtml = (interactive: boolean) => {
    // What the user is asking to look at takes priority: a specific
    // supplier they tapped "View on map" for, THEN their own location, THEN
    // just any supplier with coordinates as a last resort. Previously this
    // always centered on the user's own location and ignored which pin was
    // selected entirely.
    const hasSelectedPin = Boolean(interactive && selectedMapPin?.lat && selectedMapPin?.lng);
    const viewCenter = hasSelectedPin
      ? selectedMapPin!
      : userCoords || filteredSuppliersList.find((supplier) => supplier.lat && supplier.lng);
    if (!viewCenter) return '';

    const markersScript = filteredSuppliersList
      .filter(s => s.lat && s.lng)
      .map((s, idx) => {
        const isSelected = hasSelectedPin && s.id === selectedMapPin!.id;
        const pinColor = isSelected ? '#7C3AED' : '#0EA5E9';
        const pinSize = isSelected ? 26 : 20;
        return `
        var pinIcon${idx} = L.divIcon({
          className: 'custom-pin-container',
          html: '<div style="background:${pinColor}; border:${isSelected ? 3 : 2}px solid #FFFFFF; border-radius:50%; width:${pinSize}px; height:${pinSize}px; box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
          iconSize: [${pinSize}, ${pinSize}],
          iconAnchor: [${pinSize / 2}, ${pinSize / 2}]
        });
        var marker${idx} = L.marker([${s.lat}, ${s.lng}], { icon: pinIcon${idx} })
         .addTo(map)${interactive ? `
         .bindPopup('<b>${s.name.replace(/'/g, "\\'")}</b><br>${s.category} • ${s.distance}<br><small>${s.location.replace(/'/g, "\\'")}</small>')` : ''};
        ${isSelected ? `marker${idx}.openPopup();` : ''}
      `;
      })
      .join('\n');

    const interactionOptions = interactive
      ? '{ zoomControl: true }'
      : '{ zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, attributionControl: false }';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #E5E7EB; }
          .user-marker { background: #7C3AED; border: 3px solid #FFFFFF; border-radius: 50%; width: 18px; height: 18px; box-shadow: 0 0 10px rgba(124, 58, 237, 0.8); }
          .leaflet-control-container { ${interactive ? '' : 'display: none;'} }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Override Leaflet default icon image lookup to avoid 3rd-party PNG storage tracking blocks
          if (window.L && L.Icon && L.Icon.Default) {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
              iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzBFQTVFOSI+PHBhdGggZD0iTTEyIDJDMzguMTMgMiA0IDYuMTMgNCAxMWMwIDUuMjUgOCAxMyA4IDEzczgtNy43NSA4LTEzYzAtNC44Ny00LjEzLTktOS05em0wIDExYy0xLjY2IDAtMy0xLjM0LTMtM3MxLjM0LTMgMy0zIDMgMS4zNCAzIDMgMS4zNCAzLTMgM3oiLz48L3N2Zz4=',
              shadowUrl: ''
            });
          }

          var map = L.map('map', ${interactionOptions}).setView([${viewCenter.lat}, ${viewCenter.lng}], ${hasSelectedPin ? 17 : (interactive ? 13 : 14)});
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          ${(userCoords && !hasSelectedPin) ? `
          var userIcon = L.divIcon({ className: 'user-marker', iconSize: [18, 18], iconAnchor: [9, 9] });
          var userMarker = L.marker([${userCoords.lat}, ${userCoords.lng}], { icon: userIcon }).addTo(map);
          ${interactive ? `userMarker.bindPopup('<b>${locationSource === 'device' ? 'Your location' : 'Map center'}</b><br>${displayLocation}');` : ''}
          ` : ''}

          ${markersScript}
        </script>
      </body>
      </html>
    `;
  };

  const openOpenStreetMap = async () => {
    const mapCenter = selectedMapPin?.lat && selectedMapPin?.lng
      ? selectedMapPin
      : userCoords || filteredSuppliersList.find((supplier) => supplier.lat && supplier.lng);
    if (!mapCenter?.lat || !mapCenter?.lng) {
      Alert.alert('Map unavailable', 'Allow location access or load supplier results before opening the map.');
      return;
    }
    await Linking.openURL(`https://www.openstreetmap.org/?mlat=${mapCenter.lat}&mlon=${mapCenter.lng}#map=16/${mapCenter.lat}/${mapCenter.lng}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Header Section */}
        <View style={styles.topHeaderSection}>
          {/* Notification Bell anchored at top right above title */}
          <View style={styles.topNotifBar}>
            <TouchableOpacity 
              style={styles.notifIconBtn} 
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Bell size={19} color={LikhoraColors.textPrimary} />
              {unreadCount > 0 && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          </View>

          {/* Title Row directly below */}
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Suppliers</Text>
            <Text style={styles.headerSub}>Matched to your next step</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 2. SEARCH BAR */}
          <View style={styles.searchBox}>
            <Search size={18} color={LikhoraColors.textPlaceholder} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search suppliers, malls, or products"
              placeholderTextColor={LikhoraColors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* 3. DYNAMIC LOCATION SELECTOR FROM ONBOARDING */}
          <View style={styles.locationRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <MapPin size={16} color={LikhoraColors.aiBlue} style={{ marginRight: 6 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                {locationSource === 'device'
                  ? 'Showing near your device'
                  : locationSource === 'profile'
                    ? 'Showing near your saved location'
                    : 'Approximate — could not detect your exact location'}: <Text style={{ fontWeight: '800', color: LikhoraColors.textPrimary }}>{displayLocation}</Text>
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
              <Text style={styles.changeLocText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Explicit source picker — GPS is tried automatically by default,
              but this lets you pin to one source so a live GPS reading can't
              silently override a location you deliberately want to browse. */}
          <View style={styles.locationModeRow}>
            <TouchableOpacity
              style={[styles.locationModeChip, locationSource === 'device' && styles.locationModeChipActive]}
              onPress={() => setLocationMode('device')}
              activeOpacity={0.8}
            >
              <LocateFixed size={12} color={locationSource === 'device' ? '#FFFFFF' : LikhoraColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.locationModeChipText, locationSource === 'device' && styles.locationModeChipTextActive]}>
                Current Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationModeChip, locationSource !== 'device' && styles.locationModeChipActive]}
              onPress={() => setLocationMode('profile')}
              activeOpacity={0.8}
            >
              <Store size={12} color={locationSource !== 'device' ? '#FFFFFF' : LikhoraColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.locationModeChipText, locationSource !== 'device' && styles.locationModeChipTextActive]}>
                My Business Location
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recommendationCard}>
            <Sparkles size={17} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recommendationTitle}>
                {profileLoading ? 'Tailoring your suppliers' : 'Recommended next supplier'}
              </Text>
              <Text style={styles.recommendationText}>{supplierRecommendation}</Text>
            </View>
            {profileLoading && <ActivityIndicator size="small" color={LikhoraColors.primary} />}
          </View>

          {/* 4. FILTER CHIPS HORIZONTAL SCROLL */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {supplierCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  activeCategory === cat && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 5. VISUAL MAP HERO BANNER — a real, live map preview centered on
              the user, not a decorative placeholder. Frozen (no pan/zoom) so
              it doesn't fight the screen's scroll; tapping it opens the full
              interactive map. */}
          <TouchableOpacity
            style={styles.mapHeroBanner}
            onPress={() => {
              // Opened generically (not for a specific supplier) — clear any
              // previously selected pin so the map doesn't wrongly re-center
              // on a stale selection from an earlier "View on map" tap.
              setSelectedMapPin(null);
              setShowMapModal(true);
            }}
            activeOpacity={0.9}
          >
            {userCoords ? (
              Platform.OS === 'web' ? (
                <iframe
                  srcDoc={generateLeafletMapHtml(false)}
                  style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
                  title="Supplier map preview"
                />
              ) : (
                <WebView
                  source={{ html: generateLeafletMapHtml(false) }}
                  style={styles.mapPreviewFill}
                  pointerEvents="none"
                  scrollEnabled={false}
                  originWhitelist={['*']}
                />
              )
            ) : (
              <View style={styles.mapPreviewLoading}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <View style={styles.mapPreviewShade} pointerEvents="none" />

            <View style={styles.openMapBtn}>
              <Navigation size={14} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.openMapBtnText}>Open interactive map</Text>
            </View>
          </TouchableOpacity>

          {/* 6. CONTEXT-AWARE PICKS CARD */}
          <View style={styles.contextCard}>
            <View style={styles.contextIconBadge}>
              <Sparkles size={18} color="#0EA5E9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contextTitle}>Context-aware picks</Text>
              <Text style={styles.contextBodyText}>
                {suppliersList.length > 0
                  ? `These ${suppliersList.length} suppliers & shopping malls cover the items your active plan needs — closest to ${displayLocation} first.`
                  : `Searching live suppliers near ${displayLocation}...`}
              </Text>
            </View>
          </View>

          {/* 7. SUPPLIERS LIST HEADER + FILTER BUTTON */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              {filteredSuppliersList.length} suppliers nearby
            </Text>
            <TouchableOpacity
              style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.8}
            >
              <SlidersHorizontal size={15} color={activeFilterCount > 0 ? '#FFFFFF' : LikhoraColors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 8. REAL SUPPLIER CARDS WITH DETAILED STREET ADDRESS */}
          {resolvingLocation ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={LikhoraColors.primary} />
              <Text style={{ marginTop: 10, color: LikhoraColors.textSecondary, fontSize: 13 }}>Getting your location...</Text>
            </View>
          ) : loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={LikhoraColors.primary} />
              <Text style={{ marginTop: 10, color: LikhoraColors.textSecondary, fontSize: 13 }}>Fetching suppliers, malls & groceries near {displayLocation}...</Text>
            </View>
          ) : suppliersList.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Store size={32} color={LikhoraColors.textPlaceholder} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyStateTitle}>No suppliers found near {displayLocation}</Text>
              <Text style={styles.emptyStateSub}>
                Tap below to search again.
              </Text>
              <TouchableOpacity
                style={styles.retryApiBtn}
                onPress={loadSuppliersLive}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryApiBtnText}>Retry Live API Search</Text>
              </TouchableOpacity>
            </View>
          ) : filteredSuppliersList.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <SlidersHorizontal size={32} color={LikhoraColors.textPlaceholder} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyStateTitle}>No suppliers match your filters</Text>
              <Text style={styles.emptyStateSub}>
                {suppliersList.length} suppliers were found near {displayLocation}, but none match your current filters.
              </Text>
              <TouchableOpacity
                style={styles.retryApiBtn}
                onPress={resetFilters}
                activeOpacity={0.8}
              >
                <SlidersHorizontal size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryApiBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSuppliersList.map((item) => {
              const isAdded = addedPlans.includes(item.id);
              // Tags arrive from Google Places, Supabase and OpenStreetMap, so
              // guard the shape rather than trusting every source to hand back
              // an array of strings — one bad value here blanks the whole tab.
              const isMall =
                item.category === 'Malls & Supermarkets' ||
                (item.tags || []).some(
                  (t) =>
                    typeof t === 'string' &&
                    (t.toLowerCase().includes('mall') || t.toLowerCase().includes('supermarket'))
                );

              return (
                <View key={item.id} style={styles.supplierCard}>

                  {/* Store Photo (real photo when available, e.g. via Google Places) */}
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.supplierPhoto}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={[styles.supplierPhoto, styles.supplierPhotoPlaceholder]}>
                      <ImageOff size={22} color={LikhoraColors.textPlaceholder} />
                    </View>
                  )}

                  {/* Top Info */}
                  <TouchableOpacity style={styles.supplierTopRow} onPress={() => setSelectedSupplier(item)} activeOpacity={0.8}>
                    <TouchableOpacity
                      style={[styles.supplierIconCircle, isMall && { backgroundColor: '#E0F2FE' }]}
                      onPress={() => {
                        setShowMapModal(true);
                        setSelectedMapPin(item);
                      }}
                    >
                      {isMall ? (
                        <ShoppingBag size={20} color="#0EA5E9" />
                      ) : (
                        <MapPin size={20} color={LikhoraColors.successGreen} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <View style={styles.supplierNameRow}>
                        <Text style={styles.supplierName}>{item.name}</Text>
                        <Text style={styles.priceLevelText}>{item.price_level}</Text>
                      </View>

                      <View style={styles.ratingDistanceRow}>
                        {item.rating ? <><Star size={14} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} /><Text style={styles.ratingText}>{item.rating}</Text><Text style={styles.dotSeparator}>•</Text></> : null}
                        <Text style={styles.distanceHighlight}>{item.distance}</Text>
                      </View>

                      {/* DETAILED STREET ADDRESS LOCATION */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MapPin size={12} color={LikhoraColors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText} numberOfLines={2}>{item.location}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Product Tags */}
                  <View style={styles.tagRow}>
                    {item.tags?.map((t, idx) => (
                      <View key={idx} style={[styles.productTag, isMall && { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.productTagText, isMall && { color: '#0369A1' }]}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => Alert.alert(item.phone ? 'Contact supplier' : 'Contact details unavailable', item.phone ? `Call ${item.name} at ${item.phone}` : 'This listing does not include a phone number. Check the mapped location for current details.')}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.contactBtnText}>Contact</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.addToPlanBtn,
                        isAdded && styles.addToPlanBtnAdded,
                      ]}
                      onPress={() => toggleAddToPlan(item.id, item.name)}
                      activeOpacity={0.85}
                    >
                      {isAdded ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 6 }} />
                      ) : (
                        <Plus size={14} color="#2A2130" strokeWidth={3} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.addToPlanBtnText, isAdded && { color: '#FFFFFF' }]}>
                        {isAdded ? 'Added' : 'Add to plan'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}

        </ScrollView>

        {/* 9. INTERACTIVE LEAFLET MAP MODAL */}
        <Modal
          visible={showMapModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowMapModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={styles.mapModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapModalTitle}>Live Interactive Supplier Map</Text>
                <Text style={styles.mapModalSub}>{locationSource === 'device' ? 'Centered on device location' : 'Search results for saved location'}: {displayLocation}</Text>
              </View>

              <TouchableOpacity 
                style={styles.closeMapBtn} 
                onPress={() => setShowMapModal(false)}
                activeOpacity={0.8}
              >
                <X size={20} color={LikhoraColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Leaflet Live Map View */}
            <View style={styles.mapFrameContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={generateLeafletMapHtml(true)}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  title="Interactive Supplier Map"
                />
              ) : (
                <View style={styles.nativeMapPlaceholder}>
                  <MapPin size={40} color={LikhoraColors.primary} style={{ marginBottom: 10 }} />
                  <Text style={styles.nativeMapTitle}>Interactive Supplier Map</Text>
                  <Text style={styles.nativeMapSub}>Centered on {displayLocation}</Text>
                  <TouchableOpacity style={styles.openExternalMapBtn} onPress={openOpenStreetMap}>
                    <Text style={styles.openExternalMapText}>Open accurate map</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* YOUR LOCATION BADGE */}
              <View style={styles.yourLocationBadge}>
                <LocateFixed size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.yourLocationText}>{locationSource === 'device' ? 'Device location' : 'Saved location'} ({displayLocation})</Text>
              </View>
            </View>

            {/* Selected Supplier Card Details */}
            {selectedMapPin && (
              <View style={styles.selectedPinCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.selectedPinName}>{selectedMapPin.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedMapPin(null)}>
                    <X size={16} color={LikhoraColors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.selectedPinMeta}>{selectedMapPin.distance} • {selectedMapPin.location}</Text>
                
                <TouchableOpacity
                  style={styles.selectedPinContactBtn}
                  onPress={() => Alert.alert(selectedMapPin.phone ? 'Contact supplier' : 'Contact details unavailable', selectedMapPin.phone ? `Call ${selectedMapPin.name} at ${selectedMapPin.phone}` : 'This listing does not include a phone number.')}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.selectedPinContactText}>Contact {selectedMapPin.name}</Text>
                </TouchableOpacity>
              </View>
            )}

          </SafeAreaView>
        </Modal>

        <Modal visible={Boolean(selectedSupplier)} transparent animationType="slide" onRequestClose={() => setSelectedSupplier(null)}>
          <View style={styles.supplierDetailOverlay}>
            <View style={styles.supplierDetailSheet}>
              {selectedSupplier?.image_url && (
                <Image
                  source={{ uri: selectedSupplier.image_url }}
                  style={styles.detailPhoto}
                  contentFit="cover"
                  transition={150}
                />
              )}
              <View style={styles.detailHeader}><View style={{ flex: 1 }}><Text style={styles.detailTitle}>{selectedSupplier?.name}</Text><Text style={styles.detailCategory}>{selectedSupplier?.category}</Text></View><TouchableOpacity onPress={() => setSelectedSupplier(null)}><X size={20} color={LikhoraColors.textSecondary} /></TouchableOpacity></View>
              <Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{selectedSupplier?.location || 'Location unavailable'}</Text>
              <Text style={styles.detailLabel}>Distance</Text><Text style={styles.detailValue}>{selectedSupplier?.distance || 'Distance unavailable'}</Text>
              <Text style={styles.detailLabel}>Price range</Text><Text style={styles.detailValue}>{selectedSupplier?.price_range || selectedSupplier?.price_level || 'Contact supplier for current prices'}</Text>
              <Text style={styles.detailLabel}>Contact</Text><Text style={styles.detailValue}>{selectedSupplier?.phone || 'No public phone number in this listing'}</Text>
              <Text style={styles.detailLabel}>Listing details</Text><View style={styles.detailTags}>{selectedSupplier?.tags?.map((tag) => <View key={tag} style={styles.detailTag}><Text style={styles.detailTagText}>{tag}</Text></View>)}</View>
              <TouchableOpacity style={styles.detailMapButton} onPress={() => { setSelectedMapPin(selectedSupplier); setSelectedSupplier(null); setShowMapModal(true); }}><MapPin size={16} color="#FFFFFF" /><Text style={styles.detailMapText}>View on map</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 10. FILTER MODAL — refine what's already loaded, no re-fetch */}
        <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
          <View style={styles.supplierDetailOverlay}>
            <View style={styles.filterSheet}>
              <View style={styles.filterSheetHandle} />

              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>Filter suppliers</Text>
                  <Text style={styles.filterSheetSub}>Refine the {suppliersList.length} suppliers already found near {displayLocation}.</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={20} color={LikhoraColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Distance */}
                <Text style={styles.filterGroupLabel}>Distance</Text>
                <View style={styles.filterOptionRow}>
                  {[{ label: 'Any', value: null }, { label: '1 km', value: 1 }, { label: '3 km', value: 3 }, { label: '5 km', value: 5 }, { label: '10 km', value: 10 }].map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.filterOptionChip, maxDistanceKm === opt.value && styles.filterOptionChipActive]}
                      onPress={() => setMaxDistanceKm(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterOptionChipText, maxDistanceKm === opt.value && styles.filterOptionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rating */}
                <Text style={styles.filterGroupLabel}>Minimum rating</Text>
                <View style={styles.filterOptionRow}>
                  {[{ label: 'Any', value: null }, { label: '3.5+', value: 3.5 }, { label: '4.0+', value: 4 }, { label: '4.5+', value: 4.5 }].map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.filterOptionChip, minRating === opt.value && styles.filterOptionChipActive]}
                      onPress={() => setMinRating(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterOptionChipText, minRating === opt.value && styles.filterOptionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.filterHintText}>Only applies to listings with a published rating (mainly Google Places results) — unrated listings are hidden while a minimum is set.</Text>

                {/* Price level */}
                <Text style={styles.filterGroupLabel}>Price level</Text>
                <View style={styles.filterOptionRow}>
                  {['₱', '₱₱', '₱₱₱', '₱₱₱₱'].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.filterOptionChip, priceLevels.includes(level) && styles.filterOptionChipActive]}
                      onPress={() => togglePriceLevel(level)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterOptionChipText, priceLevels.includes(level) && styles.filterOptionChipTextActive]}>{level}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Sort by */}
                <Text style={styles.filterGroupLabel}>Sort by</Text>
                <View style={styles.filterOptionRow}>
                  {[{ label: 'Nearest', value: 'distance' as const }, { label: 'Highest rated', value: 'rating' as const }, { label: 'Name (A–Z)', value: 'name' as const }].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOptionChip, sortBy === opt.value && styles.filterOptionChipActive]}
                      onPress={() => setSortBy(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterOptionChipText, sortBy === opt.value && styles.filterOptionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Has photo toggle */}
                <TouchableOpacity style={styles.filterToggleRow} onPress={() => setPhotoOnly(!photoOnly)} activeOpacity={0.8}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <ImageIcon size={16} color={LikhoraColors.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={styles.filterToggleLabel}>Only show suppliers with a photo</Text>
                  </View>
                  <View style={[styles.checkbox, photoOnly && styles.checkboxSelected]}>
                    {photoOnly && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.filterActionsRow}>
                <TouchableOpacity style={styles.filterResetBtn} onPress={resetFilters} activeOpacity={0.8}>
                  <Text style={styles.filterResetBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilterModal(false)} activeOpacity={0.85}>
                  <Text style={styles.filterApplyBtnText}>Show {filteredSuppliersList.length} results</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  container: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  topHeaderSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  topNotifBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  headerTitleRow: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  headerSub: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  notifIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: LikhoraColors.errorRed,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: 110,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  locationText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  changeLocText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.aiBlue,
    fontFamily: LikhoraFont.fontFamily,
  },
  locationModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  locationModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  locationModeChipActive: {
    backgroundColor: LikhoraColors.aiBlue,
    borderColor: LikhoraColors.aiBlue,
  },
  locationModeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  locationModeChipTextActive: {
    color: '#FFFFFF',
  },
  filterScroll: {
    gap: 8,
    marginBottom: Spacing.four,
  },
  recommendationCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: LikhoraColors.secondaryLavender, borderRadius: Radius.large, padding: Spacing.three, marginBottom: Spacing.three },
  recommendationTitle: { fontSize: 13, color: LikhoraColors.primary, fontWeight: '800', fontFamily: LikhoraFont.fontFamily },
  recommendationText: { marginTop: 3, color: LikhoraColors.textPrimary, fontSize: 12, lineHeight: 17, fontFamily: LikhoraFont.fontFamily },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  filterChipActive: {
    backgroundColor: LikhoraColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mapHeroBanner: {
    height: 140,
    borderRadius: Radius.xlarge,
    backgroundColor: LikhoraColors.aiBlue,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: Spacing.four,
    overflow: 'hidden',
  },
  mapPreviewFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  mapPreviewLoading: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Subtle bottom shade so the "Open interactive map" pill stays legible
  // over whatever map tile colors happen to be underneath it.
  mapPreviewShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  openMapBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  openMapBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  contextIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  contextBodyText: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  filterBtnActive: {
    backgroundColor: LikhoraColors.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.xlarge,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    paddingHorizontal: Spacing.four,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  emptyStateSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  retryApiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  retryApiBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  supplierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  supplierPhoto: {
    width: '100%',
    height: 140,
    borderRadius: Radius.large,
    marginBottom: 12,
    backgroundColor: LikhoraColors.inputBackground,
  },
  supplierPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LikhoraColors.successGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supplierNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    flex: 1,
  },
  priceLevelText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    marginLeft: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  ratingDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  distanceHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.aiBlue,
    fontFamily: LikhoraFont.fontFamily,
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: LikhoraColors.textPlaceholder,
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  productTag: {
    backgroundColor: LikhoraColors.successGreenSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  productTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.successGreen,
    fontFamily: LikhoraFont.fontFamily,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 21, 75, 0.08)',
    height: 44,
    borderRadius: Radius.pill,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  addToPlanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.highlightYellow,
    height: 44,
    borderRadius: Radius.pill,
  },
  addToPlanBtnAdded: {
    backgroundColor: LikhoraColors.successGreen,
  },
  addToPlanBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2130', // Dark charcoal text on yellow for maximum readability
    fontFamily: LikhoraFont.fontFamily,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  mapModalSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  closeMapBtn: {
    padding: 6,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  mapFrameContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  yourLocationBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  yourLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  nativeMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  nativeMapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  nativeMapSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  openExternalMapBtn: {
    marginTop: 14,
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openExternalMapText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  selectedPinCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  selectedPinName: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  selectedPinMeta: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginVertical: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  selectedPinContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    marginTop: 4,
  },
  selectedPinContactText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  supplierDetailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  supplierDetailSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: Radius.xlarge, borderTopRightRadius: Radius.xlarge, padding: Spacing.four, paddingBottom: Spacing.five },
  detailPhoto: { width: '100%', height: 160, borderRadius: Radius.large, marginBottom: 14, backgroundColor: LikhoraColors.inputBackground },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  detailTitle: { fontSize: 21, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  detailCategory: { marginTop: 4, color: LikhoraColors.primary, fontWeight: '700', fontSize: 13, fontFamily: LikhoraFont.fontFamily },
  detailLabel: { marginTop: 11, color: LikhoraColors.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', fontFamily: LikhoraFont.fontFamily },
  detailValue: { marginTop: 3, color: LikhoraColors.textPrimary, fontSize: 14, fontFamily: LikhoraFont.fontFamily },
  detailTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  detailTag: { backgroundColor: LikhoraColors.secondaryLavender, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.pill },
  detailTagText: { color: LikhoraColors.primary, fontSize: 11, fontWeight: '700', fontFamily: LikhoraFont.fontFamily },
  detailMapButton: { marginTop: 20, height: 46, borderRadius: Radius.pill, backgroundColor: LikhoraColors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  detailMapText: { color: '#FFFFFF', fontWeight: '800', fontFamily: LikhoraFont.fontFamily },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  filterSheetSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterGroupLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginTop: 18,
    marginBottom: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterOptionChipActive: {
    backgroundColor: LikhoraColors.secondaryLavender,
    borderColor: LikhoraColors.primary,
  },
  filterOptionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterOptionChipTextActive: {
    color: LikhoraColors.primary,
  },
  filterHintText: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 8,
    lineHeight: 15,
    fontStyle: 'italic',
    fontFamily: LikhoraFont.fontFamily,
  },
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 4,
  },
  filterToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: LikhoraColors.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  filterResetBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
});
