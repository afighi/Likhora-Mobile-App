import React, { useState, useEffect } from 'react';
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
  LocateFixed,
  RefreshCw,
  Map as MapIcon,
  ShoppingBag
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchSuppliersFromSupabase, SupplierItem } from '@/services/supabase';
import { AppLogo } from '@/components/ui/AppLogo';

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

  // Coordinates are only used after the device actually provides them.
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'device' | 'profile'>('profile');

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

  const { displayLocation, queryCity } = getUserLocationDisplay();
  const businessType = userProfile?.business_type?.toLowerCase() || '';
  const supplierRecommendation = businessType.includes('food') || businessType.includes('carinderia')
    ? 'For your food business, start with marketplaces, groceries, and wholesale suppliers. Compare fresh ingredient prices before committing.'
    : businessType.includes('retail') || businessType.includes('sari')
      ? 'For your retail business, prioritize wholesalers and supermarkets with consistent stock and transparent prices.'
      : 'Start with the closest verified marketplace or wholesale listing, then compare their current price range before choosing.';
  const supplierCategories = ['All', 'Rice & Grains', 'Meat', 'Packaging', 'Nearby', 'Malls & Supermarkets', 'Ingredients', 'Equipment'];

  // Detect Device GPS Location
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocationSource('device');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Fetch REAL Verified Commercial Businesses, Malls, Supermarkets & Wholesalers via OpenStreetMap Overpass API
  const fetchRealOverpassSuppliers = async (lat: number, lng: number, cityName: string): Promise<SupplierItem[]> => {
    const overpassQuery = `
      [out:json][timeout:5];
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
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: overpassQuery,
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
            
            let category = 'Rice & Grains';
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
          items.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
          return items;
        }
      }
    } catch (e) {
      // Graceful timeout/network fallback to local database
      clearTimeout(timeoutId);
    }
    return [];
  };

  // Main Live API Fetcher
  const loadSuppliersLive = async () => {
    setLoading(true);
    
    // 1. Query Supabase Database First
    const { data } = await fetchSuppliersFromSupabase(activeCategory, searchQuery, queryCity);
    if (data && data.length > 0) {
      const sortedDb = data.map((supplier) => userCoords && supplier.lat && supplier.lng ? {
        ...supplier,
        distance: `${getDistanceFromLatLonInKm(userCoords.lat, userCoords.lng, Number(supplier.lat), Number(supplier.lng)).toFixed(1)} km`,
      } : supplier).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setSuppliersList(sortedDb);
      setLoading(false);
      return;
    }

    // 2. Query Live OpenStreetMap Overpass API around User's GPS Location (Malls, Supermarkets, Groceries, Markets)
    const overpassResults = userCoords ? await fetchRealOverpassSuppliers(userCoords.lat, userCoords.lng, queryCity) : [];
    if (overpassResults.length > 0) {
      const filtered = overpassResults.filter(s => activeCategory === 'All' || s.category === activeCategory);
      const sorted = (filtered.length > 0 ? filtered : overpassResults).sort(
        (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
      );
      setSuppliersList(sorted);
      setLoading(false);
      return;
    }

    // 3. Fallback Query OpenStreetMap Nominatim Places API for Malls, Supermarkets & Wholesalers
    try {
      const keyword = searchQuery.trim() 
        ? searchQuery.trim() 
        : 'supermarket mall grocery wholesale market supplier';
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
            const distKm = userCoords ? getDistanceFromLatLonInKm(userCoords.lat, userCoords.lng, itemLat, itemLng) : null;
            const isMallOrGrocery = item.display_name.toLowerCase().includes('mall') || 
                                    item.display_name.toLowerCase().includes('supermarket') ||
                                    item.display_name.toLowerCase().includes('grocery') ||
                                    item.display_name.toLowerCase().includes('puregold') ||
                                    item.display_name.toLowerCase().includes('savemore') ||
                                    item.display_name.toLowerCase().includes('robinsons');

            const detailedLoc = formatDetailedAddress(null, queryCity, item.display_name);

            return {
              id: item.place_id ? String(item.place_id) : String(idx + 1),
              name: item.display_name.split(',')[0] || `Supplier near ${queryCity}`,
              category: isMallOrGrocery ? 'Malls & Supermarkets' : 'Nearby',
              rating: '',
              distance: distKm === null ? 'Distance unavailable' : `${distKm.toFixed(1)} km`,
              location: detailedLoc,
              tags: [isMallOrGrocery ? 'Shopping Mall & Supermarket' : 'Mapped place', 'OpenStreetMap search result'],
              price_level: '',
              price_range: 'Not published by this listing',
              phone: '',
              lat: itemLat,
              lng: itemLng,
            };
          });

          // SORT STRICTLY BY NEAREST DISTANCE FIRST
          mappedFromApi.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

          const filtered = mappedFromApi.filter(s => activeCategory === 'All' || s.category === activeCategory);
          setSuppliersList(filtered.length > 0 ? filtered : mappedFromApi);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Nominatim API notice:', e);
    }

    setSuppliersList([]);
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliersLive();
  }, [activeCategory, searchQuery, queryCity, displayLocation, userCoords]);

  const toggleAddToPlan = (id: string, name: string) => {
    if (addedPlans.includes(id)) {
      setAddedPlans(addedPlans.filter(p => p !== id));
    } else {
      setAddedPlans([...addedPlans, id]);
      Alert.alert('Added to Plan', `"${name}" has been attached to your active business setup plan.`);
    }
  };

  // Generate HTML for Interactive Leaflet Map with Real Supplier Markers
  const generateLeafletMapHtml = () => {
    const mapCenter = userCoords || suppliersList.find((supplier) => supplier.lat && supplier.lng);
    if (!mapCenter) return '';
    const markersScript = suppliersList
      .filter(s => s.lat && s.lng)
      .map(s => `
        L.marker([${s.lat}, ${s.lng}])
         .addTo(map)
         .bindPopup('<b>${s.name.replace(/'/g, "\\'")}</b><br>${s.category} • ${s.distance}<br><small>${s.location.replace(/'/g, "\\'")}</small>');
      `)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
          .user-marker { background: #0EA5E9; border: 3px solid #fff; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 0 10px rgba(14,165,233,0.8); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: true }).setView([${mapCenter.lat}, ${mapCenter.lng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // This marker is only a user marker when device coordinates are available.
          var userIcon = L.divIcon({ className: 'user-marker' });
          L.marker([${mapCenter.lat}, ${mapCenter.lng}], { icon: userIcon })
           .addTo(map)
           .bindPopup('<b>${locationSource === 'device' ? 'Your location' : 'Map center'}</b><br>${displayLocation}')
           .openPopup();

          ${markersScript}
        </script>
      </body>
      </html>
    `;
  };

  const openOpenStreetMap = async () => {
    const mapCenter = selectedMapPin?.lat && selectedMapPin?.lng
      ? selectedMapPin
      : userCoords || suppliersList.find((supplier) => supplier.lat && supplier.lng);
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
                {locationSource === 'device' ? 'Showing near your device' : 'Showing near your saved location'}: <Text style={{ fontWeight: '800', color: LikhoraColors.textPrimary }}>{displayLocation}</Text>
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
              <Text style={styles.changeLocText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recommendationCard}>
            <Sparkles size={17} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}><Text style={styles.recommendationTitle}>Recommended next supplier</Text><Text style={styles.recommendationText}>{supplierRecommendation}</Text></View>
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

          {/* 5. VISUAL MAP HERO BANNER */}
          <TouchableOpacity 
            style={styles.mapHeroBanner} 
            onPress={() => setShowMapModal(true)}
            activeOpacity={0.9}
          >
            <View style={styles.mapVisualOverlay}>
              <View style={[styles.mapVisualDot, { top: '30%', left: '25%' }]} />
              <View style={[styles.mapVisualDot, { top: '55%', left: '60%' }]} />
              <View style={[styles.mapVisualDot, { top: '40%', left: '75%' }]} />
            </View>

            <View style={styles.mapPinGraphic}>
              <MapIcon size={24} color="#FFFFFF" />
            </View>

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
                  : `Connecting to live OpenStreetMap Overpass API for suppliers near ${displayLocation}...`}
              </Text>
            </View>
          </View>

          {/* 7. SUPPLIERS LIST HEADER */}
          <View style={{ marginBottom: Spacing.three }}>
            <Text style={styles.sectionHeaderTitle}>
              {suppliersList.length} suppliers nearby
            </Text>
          </View>

          {/* 8. REAL SUPPLIER CARDS WITH DETAILED STREET ADDRESS */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={LikhoraColors.primary} />
              <Text style={{ marginTop: 10, color: LikhoraColors.textSecondary, fontSize: 13 }}>Fetching suppliers, malls & groceries near {displayLocation}...</Text>
            </View>
          ) : suppliersList.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Store size={32} color={LikhoraColors.textPlaceholder} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyStateTitle}>No suppliers found near {displayLocation}</Text>
              <Text style={styles.emptyStateSub}>
                Tap below to re-query the live OpenStreetMap Places API.
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
          ) : (
            suppliersList.map((item) => {
              const isAdded = addedPlans.includes(item.id);
              const isMall = item.category === 'Malls & Supermarkets' || item.tags.some(t => t.toLowerCase().includes('mall') || t.toLowerCase().includes('supermarket'));

              return (
                <View key={item.id} style={styles.supplierCard}>
                  
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
                  srcDoc={generateLeafletMapHtml()}
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
  mapVisualOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 165, 233, 0.4)',
  },
  mapVisualDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapPinGraphic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
});
