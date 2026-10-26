import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  TextInput, 
  Modal, 
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Store,
  ShieldCheck,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Camera,
  Check,
  Trash2,
  MapPin,
  RotateCcw,
  Sparkles,
  Lock,
  X,
  Briefcase,
  Compass,
  Star,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Tag,
  ListChecks,
  ShoppingBag,
  UserRound,
  ExternalLink,
  Globe,
  Phone,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  syncUserProfile,
  fetchUserRoadmap,
  saveUserRoadmap,
  replaceUserRoadmap,
  getDefaultPhilippineRoadmapTasks,
  uploadAvatarImage,
  RoadmapTask,
  supabase,
} from '@/services/supabase';
import { resetPasswordFirebase } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { BUSINESS_PROFILES } from '@/services/businessProfiles';
import {
  PHILIPPINE_REGIONS,
  getProvincesByRegionAsync,
  getCitiesByProvinceAsync,
  getBarangaysByCityAsync,
  detectCurrentDeviceLocation,
  geocodePhilippineLocation,
  LocationItem,
} from '@/services/location';
import { SearchableDropdownModal } from '@/components/ui/SearchableDropdownModal';
import {
  analyzeMarket,
  saveMarketAnalysis,
  getLatestMarketAnalysisResult,
  MarketAnalysisResult,
} from '@/services/marketAnalysis';
import { getStartupTemplateForBusinessType } from '@/services/startupTemplates';

// Background for initials when a user has no photo
const DEFAULT_AVATAR_COLOR = '#42143E';

const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586015555751-63c29994c9f4?w=800&auto=format&fit=crop&q=80',
];

const formatBudgetDisplay = (rawBudget?: string) => {
  if (!rawBudget) return '₱₱ • Standard';
  const lower = rawBudget.toLowerCase();
  if (lower.includes('more') || lower.includes('50,000') || lower.includes('above') || lower.includes('high')) {
    return '₱₱₱ • High';
  }
  if (lower.includes('10,000') || lower.includes('25,000') || lower.includes('standard')) {
    return '₱₱ • Standard';
  }
  if (lower.includes('5,000') || lower.includes('below') || lower.includes('starter') || lower.includes('micro')) {
    return '₱ • Starter';
  }
  return rawBudget.length > 14 ? '₱₱ • Standard' : rawBudget;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, setUserProfile, logout } = useAuth();

  // Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [businessName, setBusinessName] = useState(userProfile?.business_name || '');
  const [businessType, setBusinessType] = useState(userProfile?.business_type || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [budget, setBudget] = useState(userProfile?.budget || '');

  // Preferences & Stats States
  const [pushNotifs, setPushNotifs] = useState(userProfile?.push_notifications_enabled ?? true);
  const [emailNotifs, setEmailNotifs] = useState(userProfile?.email_notifications_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Profile Visuals & Tabs
  const [avatarColor, setAvatarColor] = useState(userProfile?.avatar_color || DEFAULT_AVATAR_COLOR);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userProfile?.avatar_url || null);
  const [coverUrl, setCoverUrl] = useState<string | null>(COVER_PRESETS[0]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'showcase' | 'roadmap'>('showcase');

  // Modals
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [retakeModalVisible, setRetakeModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Roadmap Progress Stats & Tasks
  const [userRoadmapTasks, setUserRoadmapTasks] = useState<RoadmapTask[]>([]);
  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [hasPublicizedRoadmap, setHasPublicizedRoadmap] = useState(false);
  const [cleaningRoadmap, setCleaningRoadmap] = useState(false);

  // Lets the user pick a business type from presets or type their own
  const [customTypeOpen, setCustomTypeOpen] = useState(false);

  // Cascading PSGC Location & Market Viability States
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<LocationItem | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<LocationItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<LocationItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<LocationItem | null>(null);

  const [provincesList, setProvincesList] = useState<LocationItem[]>([]);
  const [citiesList, setCitiesList] = useState<LocationItem[]>([]);
  const [barangaysList, setBarangaysList] = useState<LocationItem[]>([]);
  const [loadingLocationList, setLoadingLocationList] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [latestMarketAnalysis, setLatestMarketAnalysis] = useState<MarketAnalysisResult | null>(null);
  const [loadingMarketAnalysis, setLoadingMarketAnalysis] = useState(false);

  // Sync profile fields when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setBusinessName(userProfile.business_name || '');
      setBusinessType(userProfile.business_type || '');
      setLocation(userProfile.location || '');
      setBudget(userProfile.budget || '');
      setAvatarColor(userProfile.avatar_color || DEFAULT_AVATAR_COLOR);
      setAvatarUrl(userProfile.avatar_url || null);
      setPushNotifs(userProfile.push_notifications_enabled ?? true);
      setEmailNotifs(userProfile.email_notifications_enabled ?? true);
    }
  }, [userProfile]);

  // Load Latest Market Analysis from Supabase
  useEffect(() => {
    const uid = userProfile?.id || user?.uid;
    if (uid) {
      getLatestMarketAnalysisResult(uid).then((res) => {
        if (res) setLatestMarketAnalysis(res);
      });
    }
  }, [userProfile, user]);

  // Load Roadmap Stats, Task Items, and check Community publication status
  useEffect(() => {
    async function loadStats() {
      const uid = userProfile?.id || user?.uid || 'guest';
      const { data } = await fetchUserRoadmap(uid);
      if (data && data.length > 0) {
        setUserRoadmapTasks(data);
        setTotalTasksCount(data.length);
        const done = data.filter((t: any) => t.status === 'Completed').length;
        setCompletedTasksCount(done);
      } else {
        const tmpl = getStartupTemplateForBusinessType(userProfile?.business_type || 'Micro-Enterprise');
        if (tmpl && tmpl.tasks) {
          const fallbackTasks: RoadmapTask[] = tmpl.tasks.map((t, idx) => ({
            ...t,
            status: idx < 2 ? 'Completed' : idx === 2 ? 'In Progress' : 'Pending',
          }));
          setUserRoadmapTasks(fallbackTasks);
          setTotalTasksCount(fallbackTasks.length);
          setCompletedTasksCount(2);
        }
      }

      // Check if user has actually publicized any roadmaps/templates to community
      if (uid && uid !== 'guest') {
        try {
          const { data: posts } = await supabase
            .from('community_posts')
            .select('id, template_data')
            .eq('author_id', uid);
          const hasPost = Boolean(posts && posts.some((p: any) => p.template_data && p.template_data.length > 0));
          setHasPublicizedRoadmap(hasPost);
        } catch {
          setHasPublicizedRoadmap(false);
        }
      }
    }
    loadStats();
  }, [userProfile, user]);

  const handleRecalibrateRoadmap = () => {
    Alert.alert(
      'Recalibrate Startup Roadmap?',
      `This will restore a clean, comprehensive business execution and legal launch roadmap tailored for ${userProfile?.business_type || 'your business'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalibrate',
          onPress: async () => {
            const uid = userProfile?.id || user?.uid || 'guest';
            setCleaningRoadmap(true);
            try {
              const freshTasks = getDefaultPhilippineRoadmapTasks(
                uid,
                userProfile?.business_type,
                userProfile?.location
              );
              await replaceUserRoadmap(uid, freshTasks);
              setUserRoadmapTasks(freshTasks);
              setTotalTasksCount(freshTasks.length);
              const done = freshTasks.filter((t) => t.status === 'Completed').length;
              setCompletedTasksCount(done);
              showToast(`Roadmap recalibrated to ${freshTasks.length} business & legal milestones.`);
            } catch (e) {
              console.warn('Recalibrate error:', e);
              showToast('Could not recalibrate roadmap.');
            } finally {
              setCleaningRoadmap(false);
            }
          },
        },
      ]
    );
  };

  // PSGC Cascading Dropdowns
  useEffect(() => {
    if (selectedRegion) {
      setLoadingLocationList(true);
      getProvincesByRegionAsync(selectedRegion.code).then((res) => {
        setProvincesList(res);
        setLoadingLocationList(false);
      });
    } else {
      setProvincesList([]);
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedProvince && selectedRegion) {
      setLoadingLocationList(true);
      getCitiesByProvinceAsync(selectedProvince.code, selectedRegion.code).then((res) => {
        setCitiesList(res);
        setLoadingLocationList(false);
      });
    } else {
      setCitiesList([]);
    }
  }, [selectedProvince, selectedRegion]);

  useEffect(() => {
    if (selectedCity) {
      setLoadingLocationList(true);
      getBarangaysByCityAsync(selectedCity.code).then((res) => {
        setBarangaysList(res);
        setLoadingLocationList(false);
      });
    } else {
      setBarangaysList([]);
    }
  }, [selectedCity]);

  // Update location text when dropdown items are selected
  useEffect(() => {
    if (selectedCity || selectedBarangay) {
      const parts: string[] = [];
      if (selectedBarangay) parts.push(`Brgy. ${selectedBarangay.name}`);
      if (selectedCity) parts.push(selectedCity.name);
      if (selectedProvince) parts.push(selectedProvince.shortName || selectedProvince.name);
      else if (selectedRegion) parts.push(selectedRegion.name);
      const composed = parts.join(', ');
      if (composed) setLocation(composed);
    }
  }, [selectedRegion, selectedProvince, selectedCity, selectedBarangay]);

  // GPS Location Detection
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    const result = await detectCurrentDeviceLocation();
    setDetectingLocation(false);

    if (result.region) {
      setSelectedRegion(result.region);
      const provs = await getProvincesByRegionAsync(result.region.code);
      setProvincesList(provs);
      const matchedProv = result.province || provs[0];
      setSelectedProvince(matchedProv);

      if (matchedProv) {
        const cts = await getCitiesByProvinceAsync(matchedProv.code, result.region.code);
        setCitiesList(cts);
        const matchedCity = result.city || cts[0];
        setSelectedCity(matchedCity);

        if (matchedCity) {
          const brgys = await getBarangaysByCityAsync(matchedCity.code);
          setBarangaysList(brgys);
          if (result.barangay) {
            setSelectedBarangay(result.barangay);
          }
        }
      }
    }
  };

  const handleReanalyzeLocation = async () => {
    const uid = userProfile?.id || user?.uid;
    const currentLoc = location.trim() || userProfile?.location;
    if (!uid || !currentLoc) {
      showToast('Please set your business location first.');
      return;
    }
    setLoadingMarketAnalysis(true);
    try {
      const coords = await geocodePhilippineLocation(currentLoc);
      if (!coords) {
        showToast('Could not geocode this location. Check spelling.');
        return;
      }
      const bType = userProfile?.business_type || businessType || 'Business';
      const result = await analyzeMarket({
        businessType: bType,
        locationLabel: currentLoc,
        lat: coords.lat,
        lng: coords.lng,
      });
      setLatestMarketAnalysis(result);
      await saveMarketAnalysis(uid, {
        businessType: bType,
        locationLabel: currentLoc,
        lat: coords.lat,
        lng: coords.lng,
      }, result);
      showToast('Market analysis refreshed with authentic Google reviews!');
    } catch (err) {
      console.warn('Re-analyze error:', err);
      showToast('Could not refresh market analysis. Try again.');
    } finally {
      setLoadingMarketAnalysis(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const persistPreference = async (patch: Partial<{
    avatar_color: string;
    avatar_url: string | null;
    push_notifications_enabled: boolean;
    email_notifications_enabled: boolean;
  }>) => {
    const uid = userProfile?.id || user?.uid;
    if (!uid) return;
    const updatedProfile = {
      ...userProfile,
      id: uid,
      email: userProfile?.email || user?.email || '',
      full_name: userProfile?.full_name || 'Entrepreneur',
      ...patch,
    };
    setUserProfile(updatedProfile);

    const { error } = await syncUserProfile(updatedProfile);
    if (error) {
      console.warn('Preference sync failed:', error);
      showToast('Saved on this device only — could not reach the server.');
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const uid = userProfile?.id || user?.uid;
    if (!uid) return;

    setAvatarModalVisible(false);
    setUploadingAvatar(true);
    try {
      const ext = asset.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
      const { url, error } = await uploadAvatarImage(uid, asset.base64 as string, ext);
      if (error || !url) {
        showToast('Could not upload your photo. Please try again.');
        return;
      }
      setAvatarUrl(url);
      await persistPreference({ avatar_url: url });
      showToast('Profile photo updated!');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarModalVisible(false);
    setAvatarUrl(null);
    await persistPreference({ avatar_url: null });
    showToast('Profile photo removed.');
  };

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Allow photo access to select a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setCoverUrl(result.assets[0].uri);
    showToast('Cover photo updated!');
  };

  const handleSaveProfile = async () => {
    setSaving(true);

    const updatedProfile = {
      ...userProfile,
      id: userProfile?.id || user?.uid || 'guest',
      email: userProfile?.email || user?.email || '',
      full_name: fullName.trim() || 'Entrepreneur',
      business_name: businessName.trim(),
      business_type: businessType.trim(),
      location: location.trim(),
      budget: budget.trim(),
      onboarded: userProfile?.onboarded ?? true,
    };

    try {
      const { error } = await syncUserProfile(updatedProfile);
      setUserProfile(updatedProfile);
      setIsEditing(false);

      if (error) {
        console.warn('Profile save failed:', error);
        showToast('Saved on this device only — could not reach the server.');
      } else {
        showToast('Profile details updated successfully!');
      }

      // If business location was changed, re-run market analysis and sync roadmap tasks
      const locationChanged = location.trim() !== (userProfile?.location || '').trim();
      if (locationChanged && updatedProfile.location) {
        const uid = userProfile?.id || user?.uid;
        if (uid) {
          geocodePhilippineLocation(updatedProfile.location).then(async (coords) => {
            if (coords) {
              const bType = updatedProfile.business_type || 'Business';
              const result = await analyzeMarket({
                businessType: bType,
                locationLabel: updatedProfile.location,
                lat: coords.lat,
                lng: coords.lng,
              });
              setLatestMarketAnalysis(result);
              await saveMarketAnalysis(uid, {
                businessType: bType,
                locationLabel: updatedProfile.location,
                lat: coords.lat,
                lng: coords.lng,
              }, result);
            }
          }).catch((err) => console.warn('Background market re-analysis failed:', err));

          fetchUserRoadmap(uid).then(async ({ data: tasks }) => {
            if (tasks && tasks.length > 0) {
              const updatedTasks = tasks.map((t: RoadmapTask) => {
                if (t.status === 'Pending' && t.category === 'Permits' && t.title.includes('Barangay Micro-Business Clearance')) {
                  return {
                    ...t,
                    title: `Barangay Micro-Business Clearance in ${updatedProfile.location}`,
                  };
                }
                return t;
              });
              await saveUserRoadmap(updatedTasks);
            }
          }).catch((err) => console.warn('Roadmap task location sync failed:', err));
        }
      }
    } catch (err: any) {
      console.warn('Save error:', err);
      showToast('Saved on this device only — could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    const targetEmail = userProfile?.email || user?.email;
    if (!targetEmail) {
      setResetMessage('No valid email address found on account.');
      setResetModalVisible(true);
      return;
    }

    try {
      await resetPasswordFirebase(targetEmail);
      setResetMessage(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === 'auth/too-many-requests') {
        setResetMessage('Too many reset attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/network-request-failed') {
        setResetMessage('Could not reach the server. Check your connection and try again.');
      } else if (code === 'auth/user-not-found') {
        setResetMessage(`No account found for ${targetEmail}.`);
      } else {
        setResetMessage('Could not send the reset link. Please try again in a moment.');
      }
    } finally {
      setResetModalVisible(true);
    }
  };

  const executeLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setLoggingOut(false);
      setLogoutModalVisible(false);
      router.replace('/login');
    }
  };

  const userInitials = (userProfile?.full_name || fullName) 
    ? (userProfile?.full_name || fullName).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'LK';

  const isPresetType = BUSINESS_PROFILES.some((profile) => profile.id === businessType);
  const showCustomType = customTypeOpen || (!isPresetType && businessType.trim().length > 0);
  const roadmapProgressPct = Math.round((completedTasksCount / (totalTasksCount || 1)) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 1. TOP NAVIGATION BAR WITH SETTINGS / BURGER ICON */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Business Profile</Text>
          </View>

          {/* Settings / Burger icon to open other modules */}
          <TouchableOpacity 
            style={styles.settingsHeaderBtn} 
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Open settings and modules"
          >
            <SlidersHorizontal size={19} color={LikhoraColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Toast Notification Banner */}
        {toastMessage ? (
          <View style={styles.toastBanner}>
            <Check size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        {/* 2. SCROLLABLE PROFILE BODY MATCHING COMMUNITY FORMAT */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Cover Banner */}
          <View style={styles.profileCoverHeader}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.profileCoverImage} contentFit="cover" />
            ) : (
              <View style={styles.profileCoverFallback}>
                <Store size={48} color="rgba(255, 255, 255, 0.45)" />
              </View>
            )}
            <View style={styles.profileCoverOverlay} />

            {/* Change Cover Photo Button (translucent dark glass pill) */}
            <TouchableOpacity
              style={styles.changeCoverBtn}
              onPress={handlePickCover}
              activeOpacity={0.8}
            >
              <Camera size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.changeCoverText}>Cover</Text>
            </TouchableOpacity>
          </View>

          {/* Overlapping Avatar & Identity Header */}
          <View style={styles.profileIdentityRow}>
            <View style={styles.profileAvatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} contentFit="cover" />
              ) : (
                <View style={styles.profileAvatarImgFallback}>
                  <Text style={styles.profileAvatarText}>{userInitials}</Text>
                </View>
              )}

              {uploadingAvatar && (
                <View style={[styles.profileAvatarImg, styles.avatarUploading]}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}

              {/* Change Avatar Button - ONLY badge on bottom-right of avatar circle */}
              <TouchableOpacity
                style={styles.avatarCameraBadge}
                onPress={() => setAvatarModalVisible(true)}
                activeOpacity={0.85}
              >
                <Camera size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileIdentityTextCol}>
              <View style={styles.profileTitleRow}>
                <Text style={styles.profileBusinessNameText} numberOfLines={2}>
                  {userProfile?.business_name || businessName || 'My Venture'}
                </Text>
                <View style={styles.inlineVerifiedBadge}>
                  <CheckCircle2 size={16} color="#166534" fill="#DCFCE7" />
                </View>
              </View>
              <View style={styles.profileFounderBadgeRow}>
                <UserRound size={12} color="#6E6570" style={{ marginRight: 4 }} />
                <Text style={styles.profileFounderNameText}>
                  Founder: <Text style={{ fontWeight: '800', color: '#1E1320' }}>{userProfile?.full_name || fullName || 'Entrepreneur'}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Category & Location Badges (Unified iOS plum-neutral style) */}
          <View style={styles.profileBadgeChipsRow}>
            <View style={styles.profileCategoryPill}>
              <Store size={12} color="#42143E" style={{ marginRight: 6 }} />
              <Text style={styles.profileCategoryPillText}>
                {userProfile?.business_type || businessType || 'Micro-Enterprise'}
              </Text>
            </View>
            <View style={styles.profileLocationPill}>
              <MapPin size={12} color="#5A4B5C" style={{ marginRight: 6 }} />
              <Text style={styles.profileLocationPillText} numberOfLines={1}>
                {userProfile?.location || location || 'Philippines'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Summary Bar (3-Column iOS Card) */}
          <View style={styles.profileMetricsBar}>
            <View style={styles.profileMetricItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Star size={13} color="#D97706" fill="#D97706" style={{ marginRight: 3 }} />
                <Text style={styles.profileMetricValue}>5.0</Text>
              </View>
              <Text style={styles.profileMetricLabel}>New MSME</Text>
            </View>

            <View style={styles.profileMetricDivider} />

            <View style={styles.profileMetricItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Tag size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.profileMetricValue} numberOfLines={1}>
                  {formatBudgetDisplay(userProfile?.budget || budget)}
                </Text>
              </View>
              <Text style={styles.profileMetricLabel}>Budget Tier</Text>
            </View>

            <View style={styles.profileMetricDivider} />

            <View style={styles.profileMetricItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ListChecks size={13} color="#42143E" style={{ marginRight: 3 }} />
                <Text style={styles.profileMetricValue}>
                  {completedTasksCount}/{totalTasksCount || 6}
                </Text>
              </View>
              <Text style={styles.profileMetricLabel}>Milestones</Text>
            </View>
          </View>

          {/* Tab Segmented Control (Storefront Showcase | Public Roadmap) */}
          <View style={styles.profileSegmentedControl}>
            <TouchableOpacity
              style={[
                styles.profileSegmentBtn,
                profileActiveTab === 'showcase' && styles.profileSegmentBtnActive,
              ]}
              onPress={() => setProfileActiveTab('showcase')}
              activeOpacity={0.8}
            >
              <ShoppingBag
                size={14}
                color={profileActiveTab === 'showcase' ? '#FFFFFF' : '#6E6570'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.profileSegmentBtnText,
                  profileActiveTab === 'showcase' && styles.profileSegmentBtnTextActive,
                ]}
              >
                Storefront Showcase
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileSegmentBtn,
                profileActiveTab === 'roadmap' && styles.profileSegmentBtnActive,
              ]}
              onPress={() => setProfileActiveTab('roadmap')}
              activeOpacity={0.8}
            >
              <ListChecks
                size={14}
                color={profileActiveTab === 'roadmap' ? '#FFFFFF' : '#6E6570'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.profileSegmentBtnText,
                  profileActiveTab === 'roadmap' && styles.profileSegmentBtnTextActive,
                ]}
              >
                Public Roadmap
              </Text>
              {Boolean(totalTasksCount) && (
                <View
                  style={[
                    styles.profileCountBadge,
                    profileActiveTab === 'roadmap'
                      ? styles.profileCountBadgeActive
                      : styles.profileCountBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.profileCountBadgeText,
                      profileActiveTab === 'roadmap'
                        ? styles.profileCountBadgeTextActive
                        : styles.profileCountBadgeTextInactive,
                    ]}
                  >
                    {totalTasksCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* TAB 1: STOREFRONT SHOWCASE */}
          {profileActiveTab === 'showcase' && (
            <View style={styles.profileTabContent}>
              {/* About This Business */}
              <View style={styles.profileSectionBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.profileSectionTitle}>About This Business</Text>
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Text style={styles.editInlineLink}>Edit Details</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.profileBioText}>
                  {userProfile?.business_name
                    ? `${userProfile.business_name} is a local ${userProfile.business_type || 'micro-enterprise'} based in ${userProfile.location || 'the Philippines'}, dedicated to quality Filipino community products and verified regulatory compliance.`
                    : 'Dedicated Filipino micro-enterprise serving local communities with quality products and verified regulatory compliance.'}
                </Text>
              </View>

              {/* Store Highlights & Certifications */}
              <View style={styles.profileSectionBox}>
                <Text style={styles.profileSectionTitle}>Store Highlights & Certifications</Text>
                <View style={styles.profileOfferingsGrid}>
                  {[
                    { label: 'DTI Registered MSME', icon: ShieldCheck },
                    { label: 'Barangay Micro-Business', icon: ShieldCheck },
                    { label: 'Authentic Local Service', icon: CheckCircle2 },
                    { label: 'Verified Legal Operations', icon: ShieldCheck },
                  ].map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <View key={idx} style={styles.profileOfferingChip}>
                        <IconComp size={13} color="#065F46" style={{ marginRight: 6 }} />
                        <Text style={styles.profileOfferingChipText}>{item.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Storefront & Contact Details */}
              <View style={styles.profileSectionBox}>
                <Text style={styles.profileSectionTitle}>Storefront & Contact Details</Text>
                <View style={styles.profileContactRows}>
                  <View style={styles.profileAddressCard}>
                    <MapPin size={16} color="#42143E" style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileAddressLabel}>Operating Location</Text>
                      <Text style={styles.profileAddressValue}>
                        Operating in <Text style={{ fontWeight: '700' }}>{userProfile?.location || location || 'Philippines'}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profileAddressCard}>
                    <Mail size={16} color="#42143E" style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileAddressLabel}>Official Account Email</Text>
                      <Text style={styles.profileAddressValue}>
                        {userProfile?.email || user?.email || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profileAddressCard}>
                    <Phone size={16} color="#42143E" style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileAddressLabel}>Phone / Mobile Contact</Text>
                      <Text style={styles.profileAddressValue}>
                        0917 123 4567 • Available for Customer Call & SMS
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* CTA: Promote in Negosyo Market */}
              <TouchableOpacity
                style={styles.promoteCtaBtn}
                onPress={() => router.push('/(tabs)/community')}
                activeOpacity={0.88}
              >
                <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.promoteCtaBtnText}>Promote in Community Negosyo Market</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: STARTUP ROADMAP */}
          {profileActiveTab === 'roadmap' && (
            <View style={styles.profileTabContent}>
              {/* Privacy Status & Recalibrate Card */}
              <View
                style={[
                  styles.privacyBannerBox,
                  hasPublicizedRoadmap && styles.privacyBannerBoxPublic,
                ]}
              >
                <View style={styles.privacyBannerTop}>
                  <View
                    style={[
                      styles.privacyIconPill,
                      hasPublicizedRoadmap && styles.privacyIconPillPublic,
                    ]}
                  >
                    {hasPublicizedRoadmap ? (
                      <Globe size={13} color="#065F46" />
                    ) : (
                      <Lock size={13} color="#42143E" />
                    )}
                    <Text
                      style={[
                        styles.privacyIconPillText,
                        hasPublicizedRoadmap && styles.privacyIconPillTextPublic,
                      ]}
                    >
                      {hasPublicizedRoadmap ? 'Public in Community' : 'Private to You'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.recalibrateBtn}
                    onPress={handleRecalibrateRoadmap}
                    disabled={cleaningRoadmap}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={12} color="#42143E" style={{ marginRight: 4 }} />
                    <Text style={styles.recalibrateBtnText}>
                      {cleaningRoadmap ? 'Cleaning...' : 'Recalibrate'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.privacyBannerDesc,
                    hasPublicizedRoadmap && styles.privacyBannerDescPublic,
                  ]}
                >
                  {hasPublicizedRoadmap
                    ? 'You have shared a template in the Community Negosyo Market. Fellow entrepreneurs can discover your roadmap.'
                    : 'This roadmap is strictly private to your account. None of these milestones are visible to the public or community unless you choose to share them.'}
                </Text>

                {!hasPublicizedRoadmap && (
                  <TouchableOpacity
                    style={styles.privacyShareCta}
                    onPress={() => router.push('/(tabs)/community')}
                    activeOpacity={0.8}
                  >
                    <Globe size={13} color="#42143E" style={{ marginRight: 6 }} />
                    <Text style={styles.privacyShareCtaText}>Publicize a Template to Community</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress Header Card */}
              <View style={styles.roadmapHeaderCard}>
                <View style={styles.roadmapProgressRow}>
                  <Text style={styles.roadmapProgressTitle}>Founder's Launch Milestones Progress</Text>
                  <Text style={styles.roadmapProgressPercent}>{roadmapProgressPct}%</Text>
                </View>

                <View style={styles.profileProgressBarTrack}>
                  <View style={[styles.profileProgressBarFill, { width: `${roadmapProgressPct}%` }]} />
                </View>

                <Text style={styles.roadmapSubNotice}>
                  Compliance permits and startup milestones registered for {userProfile?.business_name || 'your business'}.
                </Text>
              </View>

              {/* Milestones Stepper List */}
              {userRoadmapTasks.length === 0 ? (
                <View style={styles.roadmapEmptyBox}>
                  <ListChecks size={32} color="#94A3B8" />
                  <Text style={styles.roadmapEmptyText}>No roadmap milestones created yet.</Text>
                </View>
              ) : (
                <View style={styles.roadmapTimelineList}>
                  {userRoadmapTasks.map((task, idx) => {
                    const isCompleted = task.status === 'Completed';
                    const isInProgress = task.status === 'In Progress';

                    return (
                      <View key={task.id || `task-${idx}`} style={styles.roadmapTimelineItem}>
                        <View style={styles.roadmapTimelineStepCol}>
                          <View
                            style={[
                              styles.roadmapStepCircle,
                              isCompleted && styles.roadmapStepCircleCompleted,
                              isInProgress && styles.roadmapStepCircleInProgress,
                            ]}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={14} color="#FFFFFF" />
                            ) : (
                              <Text
                                style={[
                                  styles.roadmapStepCircleNum,
                                  (isCompleted || isInProgress) && { color: '#FFFFFF' },
                                ]}
                              >
                                {idx + 1}
                              </Text>
                            )}
                          </View>
                          {idx < userRoadmapTasks.length - 1 && (
                            <View style={styles.roadmapTimelineConnectorLine} />
                          )}
                        </View>

                        <View style={styles.roadmapTaskCard}>
                          <View style={styles.roadmapTaskTopRow}>
                            <Text style={styles.roadmapTaskTitle}>{task.title}</Text>
                            <View
                              style={[
                                styles.roadmapStatusPill,
                                isCompleted && styles.roadmapStatusPillCompleted,
                                isInProgress && styles.roadmapStatusPillInProgress,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roadmapStatusPillText,
                                  isCompleted && { color: '#166534' },
                                  isInProgress && { color: '#92400E' },
                                ]}
                              >
                                {task.status || 'Pending'}
                              </Text>
                            </View>
                          </View>

                          {Boolean(task.desc) && (
                            <Text style={styles.roadmapTaskDesc}>{task.desc}</Text>
                          )}

                          <View style={styles.roadmapTaskMetaBadges}>
                            {Boolean(task.agency) && (
                              <View style={styles.roadmapAgencyBadge}>
                                <ShieldCheck size={11} color="#42143E" style={{ marginRight: 4 }} />
                                <Text style={styles.roadmapAgencyBadgeText}>{task.agency}</Text>
                              </View>
                            )}
                            {Boolean(task.legal_basis) && (
                              <View style={styles.roadmapLegalBadge}>
                                <Text style={styles.roadmapLegalBadgeText}>{task.legal_basis}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Quick CTA to open Full Roadmap */}
              <TouchableOpacity
                style={styles.openRoadmapBtn}
                onPress={() => router.push('/(tabs)/roadmap')}
                activeOpacity={0.88}
              >
                <ListChecks size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.openRoadmapBtnText}>Manage in Roadmap Tab</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 3. SETTINGS & OTHER MODULES MODAL (Opened via Settings / Burger icon) */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalBackdrop}>
          <View style={styles.settingsModalSheet}>
            {/* Modal Header */}
            <View style={styles.settingsModalHeader}>
              <View>
                <Text style={styles.settingsModalTitle}>Settings & Modules</Text>
                <Text style={styles.settingsModalSubtitle}>Account management and business tools</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsCloseBtn}
                onPress={() => setSettingsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#1E1320" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsScrollBody}>
              {/* Group 1: Business Modules */}
              <Text style={styles.settingsGroupHeader}>Business Modules</Text>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setIsEditing(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#F6EDF7' }]}>
                  <Store size={18} color="#4A154B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Edit Business & Account Details</Text>
                  <Text style={styles.settingsMenuDesc}>Change venture name, category, and location</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  router.push('/my-templates');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#EEF2FF' }]}>
                  <ListChecks size={18} color="#4338CA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>My Roadmaps & Saved Templates</Text>
                  <Text style={styles.settingsMenuDesc}>Switch active launch roadmaps and custom plans</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  router.push('/business-portfolio');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Briefcase size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Business Portfolio</Text>
                  <Text style={styles.settingsMenuDesc}>View registered business identity and assets</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Group 2: Market Analysis */}
              <Text style={styles.settingsGroupHeader}>Market Analysis</Text>

              <View style={styles.viabilityCardBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.viabilityTitle}>Market Viability</Text>
                  <TouchableOpacity
                    style={styles.refreshViabilityBtn}
                    onPress={handleReanalyzeLocation}
                    disabled={loadingMarketAnalysis}
                  >
                    <RefreshCw size={12} color="#4A154B" style={{ marginRight: 4 }} />
                    <Text style={styles.refreshViabilityText}>{loadingMarketAnalysis ? 'Analyzing...' : 'Refresh'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.viabilitySubText}>
                  {latestMarketAnalysis
                    ? `${(latestMarketAnalysis.untappedOpportunity || latestMarketAnalysis.recommendation || latestMarketAnalysis.suggestedTargetMarket?.summary || '').slice(0, 100)}...`
                    : 'Analyze authentic Google Maps reviews for your location.'}
                </Text>
              </View>

              {/* Group 3: Notifications & Preferences */}
              <Text style={styles.settingsGroupHeader}>Notifications</Text>

              <View style={styles.settingToggleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Push Notifications</Text>
                  <Text style={styles.settingsMenuDesc}>Get alerts for milestone updates and community replies</Text>
                </View>
                <Switch
                  value={pushNotifs}
                  onValueChange={(val) => {
                    setPushNotifs(val);
                    void persistPreference({ push_notifications_enabled: val });
                    showToast(val ? 'Push notifications enabled' : 'Push notifications disabled');
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#4A154B' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingToggleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Email Updates</Text>
                  <Text style={styles.settingsMenuDesc}>Receive regulatory updates and weekly business insights</Text>
                </View>
                <Switch
                  value={emailNotifs}
                  onValueChange={(val) => {
                    setEmailNotifs(val);
                    void persistPreference({ email_notifications_enabled: val });
                    showToast(val ? 'Email updates enabled' : 'Email updates disabled');
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#4A154B' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Group 4: Account Actions */}
              <Text style={styles.settingsGroupHeader}>Account & Security</Text>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setRetakeModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#FFFBEB' }]}>
                  <RotateCcw size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Retake Onboarding Questionnaire</Text>
                  <Text style={styles.settingsMenuDesc}>Recalibrate your venture type and budget</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  handlePasswordReset();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#F1F5F9' }]}>
                  <Lock size={18} color="#475569" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsMenuTitle}>Reset Password</Text>
                  <Text style={styles.settingsMenuDesc}>Send a secure password reset link to your email</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Logout Item */}
              <TouchableOpacity
                style={[styles.settingsMenuItem, { borderBottomWidth: 0, marginTop: 8 }]}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setLogoutModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsMenuIconBg, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsMenuTitle, { color: '#DC2626' }]}>Log Out</Text>
                  <Text style={styles.settingsMenuDesc}>Sign out of your Likhora account</Text>
                </View>
                <ChevronRight size={18} color="#DC2626" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. EDIT PROFILE FORM MODAL */}
      <Modal
        visible={isEditing}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.settingsModalBackdrop}>
          <View style={styles.settingsModalSheet}>
            <View style={styles.settingsModalHeader}>
              <View>
                <Text style={styles.settingsModalTitle}>Edit Business & Account</Text>
                <Text style={styles.settingsModalSubtitle}>Update details shown on your public storefront</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsCloseBtn}
                onPress={() => setIsEditing(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#1E1320" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalScrollBody}>
              <Text style={styles.inputLabel}>Full Name / Founder</Text>
              <TextInput
                style={styles.inputField}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Business / Venture Name</Text>
              <TextInput
                style={styles.inputField}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Aling Nena's Carinderia"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Business Category / Industry</Text>
              <View style={styles.typeChipRow}>
                {BUSINESS_PROFILES.map((profile) => {
                  const selected = !showCustomType && businessType === profile.id;
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={[styles.typeChip, selected && styles.typeChipSelected]}
                      onPress={() => {
                        setCustomTypeOpen(false);
                        setBusinessType(profile.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                        {profile.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.typeChip, showCustomType && styles.typeChipSelected]}
                  onPress={() => {
                    setCustomTypeOpen(true);
                    if (isPresetType) setBusinessType('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeChipText, showCustomType && styles.typeChipTextSelected]}>
                    Something else
                  </Text>
                </TouchableOpacity>
              </View>

              {showCustomType && (
                <TextInput
                  style={styles.inputField}
                  value={businessType}
                  onChangeText={setBusinessType}
                  placeholder="e.g. pet grooming, car wash, print shop"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              )}

              <View style={{ marginTop: 6, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Business Location (PSGC)</Text>
                  <TouchableOpacity
                    onPress={() => setShowLocationPicker(!showLocationPicker)}
                    style={styles.pickerToggleBtn}
                    activeOpacity={0.7}
                  >
                    <MapPin size={13} color={LikhoraColors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.pickerToggleText}>
                      {showLocationPicker ? 'Hide PSGC Picker' : 'Change Location'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.inputField, { backgroundColor: '#F8FAFC' }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Brgy. Batasan Hills, Quezon City, Metro Manila"
                  placeholderTextColor="#94A3B8"
                />

                {showLocationPicker && (
                  <View style={styles.locationPickerCard}>
                    <TouchableOpacity
                      style={styles.gpsDetectBtn}
                      onPress={handleDetectLocation}
                      disabled={detectingLocation}
                      activeOpacity={0.8}
                    >
                      {detectingLocation ? (
                        <ActivityIndicator size="small" color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                      ) : (
                        <Compass size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.gpsDetectText}>
                        {detectingLocation ? 'Detecting GPS...' : 'Use Current Device Location'}
                      </Text>
                    </TouchableOpacity>

                    {loadingLocationList && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                        <ActivityIndicator size="small" color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: LikhoraColors.textSecondary }}>Loading PSGC choices...</Text>
                      </View>
                    )}

                    <SearchableDropdownModal
                      label="Region"
                      placeholder="Select Region..."
                      items={PHILIPPINE_REGIONS}
                      selectedItem={selectedRegion}
                      onSelect={(item) => {
                        setSelectedRegion(item);
                        setSelectedProvince(null);
                        setSelectedCity(null);
                        setSelectedBarangay(null);
                      }}
                    />

                    <SearchableDropdownModal
                      label="Province"
                      placeholder={selectedRegion ? 'Select Province...' : 'Select Region first'}
                      items={provincesList}
                      selectedItem={selectedProvince}
                      onSelect={(item) => {
                        setSelectedProvince(item);
                        setSelectedCity(null);
                        setSelectedBarangay(null);
                      }}
                      disabled={!selectedRegion}
                    />

                    <SearchableDropdownModal
                      label="City / Municipality"
                      placeholder={selectedProvince ? 'Select City / Municipality...' : 'Select Province first'}
                      items={citiesList}
                      selectedItem={selectedCity}
                      onSelect={(item) => {
                        setSelectedCity(item);
                        setSelectedBarangay(null);
                      }}
                      disabled={!selectedProvince}
                    />

                    <SearchableDropdownModal
                      label="Barangay"
                      placeholder={selectedCity ? 'Select Barangay...' : 'Select City first'}
                      items={barangaysList}
                      selectedItem={selectedBarangay}
                      onSelect={(item) => setSelectedBarangay(item)}
                      disabled={!selectedCity}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.inputLabel}>Starting Budget</Text>
              <TextInput
                style={styles.inputField}
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. ₱20,000 - ₱50,000"
                placeholderTextColor="#94A3B8"
              />

              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={saving}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. AVATAR PICKER MODAL */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <X size={20} color={LikhoraColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Your photo appears on your business showcase and community roadmaps.
            </Text>

            <TouchableOpacity style={styles.photoAction} onPress={handlePickAvatar} activeOpacity={0.8}>
              <View style={[styles.photoActionIcon, { backgroundColor: LikhoraColors.primarySoft }]}>
                <Camera size={17} color={LikhoraColors.primary} />
              </View>
              <Text style={styles.photoActionText}>
                {avatarUrl ? 'Choose a different photo' : 'Choose a photo'}
              </Text>
            </TouchableOpacity>

            {avatarUrl ? (
              <TouchableOpacity style={styles.photoAction} onPress={handleRemoveAvatar} activeOpacity={0.8}>
                <View style={[styles.photoActionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Trash2 size={17} color={LikhoraColors.errorRed} />
                </View>
                <Text style={[styles.photoActionText, { color: LikhoraColors.errorRed }]}>
                  Remove photo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* 6. LOG OUT MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBoxRed}>
              <LogOut size={26} color={LikhoraColors.errorRed} />
            </View>

            <Text style={styles.modalTitleCentered}>Log Out of Account?</Text>
            <Text style={styles.modalSubtitleCentered}>
              Are you sure you want to log out of Likhora? You will need to log back in to access your business roadmap.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalDestructiveBtn} 
                onPress={executeLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDestructiveText}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. RETAKE ONBOARDING MODAL */}
      <Modal
        visible={retakeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRetakeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBoxBlue}>
              <RotateCcw size={26} color="#2563EB" />
            </View>

            <Text style={styles.modalTitleCentered}>Retake Business Setup?</Text>
            <Text style={styles.modalSubtitleCentered}>
              This will allow you to update your business category, target location, and generate a fresh AI roadmap strategy.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setRetakeModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalPrimaryBtn} 
                onPress={() => {
                  setRetakeModalVisible(false);
                  router.push('/onboarding');
                }}
              >
                <Text style={styles.modalPrimaryText}>Start Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. PASSWORD RESET FEEDBACK MODAL */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBoxPurple}>
              <Lock size={26} color="#9333EA" />
            </View>

            <Text style={styles.modalTitleCentered}>Security & Reset</Text>
            <Text style={styles.modalSubtitleCentered}>{resetMessage}</Text>

            <Button
              title="Got It"
              onPress={() => setResetModalVisible(false)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(66, 20, 62, 0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  settingsHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // ---------------- Hero Cover & Avatar Header ----------------
  profileCoverHeader: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: '#381235',
  },
  profileCoverImage: {
    width: '100%',
    height: '100%',
  },
  profileCoverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#320E2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCoverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(12px)' } as any)
      : {}),
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginTop: -36, // -mt-9: pulls ONLY the 76px circular avatar up over cover photo
    marginRight: 14,
  },
  profileAvatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  profileAvatarImgFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#42143E',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(135deg, #5C2157 0%, #42143E 100%)' } as any)
      : {}),
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  avatarUploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#42143E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentityTextCol: {
    flex: 1,
    paddingTop: 10, // pt-2.5: at least 10px clear white space below the cover photo edge
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  inlineVerifiedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBusinessNameText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 23,
  },
  profileFounderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  profileFounderNameText: {
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileBadgeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F3F7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E6DEE8',
  },
  profileCategoryPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F3F7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E6DEE8',
  },
  profileLocationPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5A4B5C',
    fontFamily: LikhoraFont.fontFamily,
    maxWidth: 200,
  },

  // ---------------- Metrics Bar ----------------
  profileMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    marginBottom: 16,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 20px -2px rgba(30, 19, 32, 0.05)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        }),
  },
  profileMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6E6570',
    marginTop: 3,
    fontFamily: LikhoraFont.fontFamily,
  },
  profileMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(66, 20, 62, 0.09)',
  },

  // ---------------- Segmented Control ----------------
  profileSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EAE7EF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  profileSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  profileSegmentBtnActive: {
    backgroundColor: '#42143E',
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        }),
  },
  profileSegmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileSegmentBtnTextActive: {
    color: '#FFFFFF',
  },
  profileCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    marginLeft: 6,
  },
  profileCountBadgeInactive: {
    backgroundColor: '#DCD2DF',
  },
  profileCountBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  profileCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileCountBadgeTextInactive: {
    color: '#42143E',
  },
  profileCountBadgeTextActive: {
    color: '#42143E',
  },

  // ---------------- Tab Content ----------------
  profileTabContent: {
    paddingHorizontal: 20,
  },
  profileSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginBottom: 16,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 10px rgba(30, 19, 32, 0.03)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
        }),
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#42143E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  editInlineLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileBioText: {
    fontSize: 13,
    color: '#332735',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  profileOfferingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  profileOfferingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profileOfferingChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#065F46',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileContactRows: {
    gap: 10,
    marginTop: 10,
  },
  profileAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F7FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.06)',
  },
  profileAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E6570',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 2,
  },
  profileAddressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E1320',
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
  },
  promoteCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42143E',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
    elevation: 2,
  },
  promoteCtaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Roadmap Tab ----------------
  roadmapHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginBottom: 14,
    elevation: 1,
  },
  roadmapProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roadmapProgressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapProgressPercent: {
    fontSize: 14,
    fontWeight: '900',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EADCEE',
    overflow: 'hidden',
    marginBottom: 8,
  },
  profileProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#42143E',
  },
  roadmapSubNotice: {
    fontSize: 11,
    color: '#6E6570',
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapEmptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  roadmapEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTimelineList: {
    gap: 0,
  },
  roadmapTimelineItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roadmapTimelineStepCol: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  roadmapStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roadmapStepCircleCompleted: {
    backgroundColor: '#16A34A',
  },
  roadmapStepCircleInProgress: {
    backgroundColor: '#D97706',
  },
  roadmapStepCircleNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTimelineConnectorLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  roadmapTaskCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.1)',
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(30, 19, 32, 0.04)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        }),
  },
  roadmapTaskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  roadmapTaskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 17,
  },
  roadmapStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roadmapStatusPillCompleted: {
    backgroundColor: '#DCFCE7',
  },
  roadmapStatusPillInProgress: {
    backgroundColor: '#FEF3C7',
  },
  roadmapStatusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTaskDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTaskMetaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  roadmapAgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EEF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roadmapAgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapLegalBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roadmapLegalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4338CA',
    fontFamily: LikhoraFont.fontFamily,
  },
  openRoadmapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42143E',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
    elevation: 2,
  },
  openRoadmapBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Settings & Modules Sheet Modal ----------------
  settingsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  settingsModalSheet: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 24,
    elevation: 16,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(66, 20, 62, 0.08)',
  },
  settingsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  settingsModalSubtitle: {
    fontSize: 11,
    color: '#6E6570',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  settingsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  settingsGroupHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A8E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(66, 20, 62, 0.06)',
  },
  settingsMenuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsMenuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  settingsMenuDesc: {
    fontSize: 11,
    color: '#6E6570',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  settingToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(66, 20, 62, 0.06)',
  },
  viabilityCardBox: {
    backgroundColor: '#FAF8FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.1)',
  },
  viabilityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  refreshViabilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  refreshViabilityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A154B',
    fontFamily: LikhoraFont.fontFamily,
  },
  viabilitySubText: {
    fontSize: 11,
    color: '#6E6570',
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Edit Form Modal ----------------
  editModalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1320',
    marginTop: 10,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontFamily: LikhoraFont.fontFamily,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipSelected: {
    backgroundColor: '#42143E',
    borderColor: '#42143E',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    fontFamily: LikhoraFont.fontFamily,
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pickerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  locationPickerCard: {
    backgroundColor: '#FAF8FC',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 21, 75, 0.15)',
  },
  gpsDetectText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Confirmation Dialogs & Modals ----------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6E6570',
    lineHeight: 17,
    marginBottom: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalTitleCentered: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1320',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalSubtitleCentered: {
    fontSize: 12,
    color: '#6E6570',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  photoActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalIconBoxRed: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalIconBoxBlue: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalIconBoxPurple: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalDestructiveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: LikhoraColors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDestructiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  privacyBannerBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 12,
  },
  privacyBannerBoxPublic: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  privacyBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  privacyIconPillPublic: {
    backgroundColor: '#D1FAE5',
  },
  privacyIconPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  privacyIconPillTextPublic: {
    color: '#065F46',
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(66, 20, 62, 0.15)',
  },
  recalibrateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  privacyBannerDesc: {
    fontSize: 12,
    color: '#4A3B52',
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 8,
  },
  privacyBannerDescPublic: {
    color: '#065F46',
    marginBottom: 0,
  },
  privacyShareCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    marginTop: 4,
  },
  privacyShareCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
});
