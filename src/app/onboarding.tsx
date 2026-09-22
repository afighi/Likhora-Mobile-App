import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  TextInput,
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Utensils, 
  Store, 
  Globe, 
  Wrench, 
  ShoppingBag, 
  PlusCircle, 
  MapPin, 
  Info, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  syncUserProfile,
  saveUserRoadmap,
  saveOnboardingStepProgress,
  getDefaultPhilippineRoadmapTasks,
  tailorRoadmapTasks,
  RoadmapTask,
  OnboardingAnswers,
} from '@/services/supabase';
import {
  BUSINESS_PROFILES,
  BusinessProfile,
  CUSTOM_BUSINESS_ID,
  GENERIC_PROFILE,
  getBusinessProfile,
} from '@/services/businessProfiles';
import { generateCustomBusinessProfile } from '@/services/onboardingAdvisor';
import {
  PHILIPPINE_REGIONS,
  getProvincesByRegionAsync,
  getCitiesByProvinceAsync,
  getBarangaysByCityAsync,
  detectCurrentDeviceLocation,
  geocodePhilippineLocation,
  LocationItem,
} from '@/services/location';
import { analyzeMarket, saveMarketAnalysis, MarketAnalysisResult } from '@/services/marketAnalysis';
import { SearchableDropdownModal } from '@/components/ui/SearchableDropdownModal';

// SDG 8.3 accessibility: a first-time entrepreneur may not yet know what
// these agency acronyms mean, so every permit chip gets a one-line plain-
// language explanation instead of assuming the term is self-evident.
// Matched by substring since businessProfiles.ts mixes short codes ('DTI')
// and fuller labels ("Mayor's / Business Permit") across profiles.
const PERMIT_PLAIN_TEXT: { match: string; caption: string }[] = [
  { match: 'barangay', caption: 'A clearance from your local barangay hall — the first, cheapest step.' },
  { match: 'dti', caption: 'Registers your business name with the Department of Trade and Industry.' },
  { match: 'sec', caption: 'Registers your company with the Securities and Exchange Commission (for partnerships/corporations).' },
  { match: 'mayor', caption: "Your city or municipal hall's permit to legally operate at your location." },
  { match: 'bir', caption: 'Tax registration with the Bureau of Internal Revenue — needed to issue official receipts.' },
  { match: 'sanitary', caption: 'A health-safety inspection required for food-handling businesses.' },
  { match: 'health card', caption: 'A personal health clearance for anyone directly handling food.' },
  { match: 'occupational', caption: "A local government permit for the specific work you'll be doing." },
];

const getPermitCaption = (permitLabel: string): string => {
  const lower = permitLabel.toLowerCase();
  const found = PERMIT_PLAIN_TEXT.find((entry) => lower.includes(entry.match));
  return found?.caption || 'A requirement for your business type — details are in your roadmap.';
};

// businessProfiles.ts stays UI-free, so it names an icon and this maps it.
const PROFILE_ICONS = {
  store: Store,
  utensils: Utensils,
  globe: Globe,
  wrench: Wrench,
  'shopping-bag': ShoppingBag,
  'plus-circle': PlusCircle,
} as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, userProfile, setUserProfile, setOnboardingCompleted } = useAuth();

  const [step, setStep] = useState(1); // 1 to 7, 8 = Building Plan
  const [loading, setLoading] = useState(false);

  // STEP 1 State: Business Type & Name
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');

  // STEP 2 State: Stage
  const [selectedStage, setSelectedStage] = useState('');

  // STEP 3 State: Location System
  const [selectedRegion, setSelectedRegion] = useState<LocationItem | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<LocationItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<LocationItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<LocationItem | null>(null);

  // Dynamic Location Lists
  const [provincesList, setProvincesList] = useState<LocationItem[]>([]);
  const [citiesList, setCitiesList] = useState<LocationItem[]>([]);
  const [barangaysList, setBarangaysList] = useState<LocationItem[]>([]);
  const [loadingLocationList, setLoadingLocationList] = useState(false);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetectedText, setLocationDetectedText] = useState('');
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysisResult | null>(null);
  const [analyzingMarket, setAnalyzingMarket] = useState(false);
  // Segments the AI flagged as needing explicit confirmation (under-18) before
  // they're treated as part of the target market — never assumed silently.
  const [confirmedSegments, setConfirmedSegments] = useState<Set<string>>(new Set());

  // STEP 4 State: Market & Product
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [differentiator, setDifferentiator] = useState('');
  const [researchStage, setResearchStage] = useState('');
  // Answers to the business-type-specific questions, keyed by question id.
  const [extraAnswers, setExtraAnswers] = useState<{ [id: string]: string }>({});

  // Custom business types have no hand-written profile, so Khora builds one.
  const [customProfile, setCustomProfile] = useState<BusinessProfile | null>(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [profileFromAI, setProfileFromAI] = useState(false);

  // STEP 5 State: Finances
  const [startingBudget, setStartingBudget] = useState('');
  const [fundingSources, setFundingSources] = useState<string[]>([]);
  const [cashRunway, setCashRunway] = useState('');

  // STEP 6 State: Law & Setup
  const [registrationType, setRegistrationType] = useState('');
  const [obtainedPermits, setObtainedPermits] = useState<string[]>([]);
  const [insuranceStatus, setInsuranceStatus] = useState('');

  // STEP 7 State: Risks & Backup Plan
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);

  // Building Plan Checklist Animation State (Step 8)
  const [buildingStep, setBuildingStep] = useState(0);

  // Step Change Fade/Slide Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / 7)).current;

  // Restore Onboarding Draft & Saved Step from Database on mount
  useEffect(() => {
    if (userProfile && !userProfile.onboarded && userProfile.onboarding_step) {
      const savedStep = Math.min(Math.max(userProfile.onboarding_step, 1), 7);
      setStep(savedStep);
      progressAnim.setValue(savedStep / 7);

      if (userProfile.onboarding_draft) {
        try {
          const draft = JSON.parse(userProfile.onboarding_draft);
          if (draft.selectedCategory) setSelectedCategory(draft.selectedCategory);
          if (draft.customCategory) setCustomCategory(draft.customCategory);
          if (draft.businessNameInput) setBusinessNameInput(draft.businessNameInput);
          if (draft.selectedStage) setSelectedStage(draft.selectedStage);
          if (draft.selectedRegion) setSelectedRegion(draft.selectedRegion);
          if (draft.selectedProvince) setSelectedProvince(draft.selectedProvince);
          if (draft.selectedCity) setSelectedCity(draft.selectedCity);
          if (draft.selectedBarangay) setSelectedBarangay(draft.selectedBarangay);
          if (draft.selectedCustomers) setSelectedCustomers(draft.selectedCustomers);
          if (draft.differentiator) setDifferentiator(draft.differentiator);
          if (draft.researchStage) setResearchStage(draft.researchStage);
          if (draft.startingBudget) setStartingBudget(draft.startingBudget);
          if (draft.fundingSources) setFundingSources(draft.fundingSources);
          if (draft.cashRunway) setCashRunway(draft.cashRunway);
          if (draft.registrationType) setRegistrationType(draft.registrationType);
          if (draft.obtainedPermits) setObtainedPermits(draft.obtainedPermits);
          if (draft.insuranceStatus) setInsuranceStatus(draft.insuranceStatus);
          if (draft.selectedRisks) setSelectedRisks(draft.selectedRisks);
          if (draft.extraAnswers) setExtraAnswers(draft.extraAnswers);
        } catch (e) {
          console.warn('Error parsing saved onboarding draft:', e);
        }
      }
    }
  }, [userProfile]);

  // The profile driving every business-specific question and the two
  // operational roadmap tasks. A built-in type resolves instantly; a custom
  // one waits on Khora, falling back to neutral copy until it arrives.
  const activeProfile: BusinessProfile = useMemo(() => {
    if (selectedCategory === CUSTOM_BUSINESS_ID) {
      const typed = customCategory.trim();
      return customProfile || { ...GENERIC_PROFILE, id: typed || GENERIC_PROFILE.id, label: typed || GENERIC_PROFILE.label };
    }
    return getBusinessProfile(selectedCategory);
  }, [selectedCategory, customCategory, customProfile]);

  // Contingency copy for exactly the risks this user was shown, so the roadmap
  // and the on-screen plan can never disagree.
  const riskContingencies = useMemo(
    () => Object.fromEntries(activeProfile.risks.map((r) => [r.risk, r.contingency])),
    [activeProfile]
  );

  /**
   * Kicks off Khora's profile build for a custom business type. Fired when the
   * user leaves step 1, so by the time they reach step 4 the tailored
   * questions are usually already there.
   */
  const ensureCustomProfile = async () => {
    const typed = customCategory.trim();
    if (selectedCategory !== CUSTOM_BUSINESS_ID || !typed) return;
    if (customProfile?.id === typed) return; // already built for this exact input

    setGeneratingProfile(true);
    try {
      const locationText = selectedCity?.name || selectedProvince?.name || null;
      const { profile, source } = await generateCustomBusinessProfile(typed, locationText);
      setCustomProfile(profile);
      setProfileFromAI(source === 'khora-ai');
    } finally {
      setGeneratingProfile(false);
    }
  };

  const animateToStep = (newStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    setStep(newStep);

    Animated.timing(progressAnim, {
      toValue: Math.min(newStep / 7, 1),
      duration: 250,
      useNativeDriver: false,
    }).start();

    // Auto-save onboarding step and draft to Supabase Database
    if (user?.uid) {
      const currentDraft = {
        selectedCategory,
        customCategory,
        businessNameInput,
        selectedStage,
        selectedRegion,
        selectedProvince,
        selectedCity,
        selectedBarangay,
        selectedCustomers,
        differentiator,
        researchStage,
        startingBudget,
        fundingSources,
        cashRunway,
        registrationType,
        obtainedPermits,
        insuranceStatus,
        selectedRisks,
        extraAnswers,
      };
      const profileWithProgress = {
        id: user.uid,
        email: userProfile?.email || user.email || '',
        full_name: userProfile?.full_name || user.displayName || 'Entrepreneur',
        ...userProfile,
        onboarded: false,
        onboarding_step: newStep,
        onboarding_draft: JSON.stringify(currentDraft),
      };

      setUserProfile(profileWithProgress);
      void saveOnboardingStepProgress(user.uid, newStep, currentDraft, profileWithProgress);
    }
  };

  /**
   * Real market/location analysis: geocodes the chosen city, pulls actual
   * nearby competitor listings (rating + review count) via Places, and lets
   * Khora AI reason about saturation from density AND review signal together
   * — never from a hardcoded "food = 88, retail = 78" table like before.
   */
  const runMarketAnalysis = async (businessType: string, locationLabel: string) => {
    setAnalyzingMarket(true);
    setConfirmedSegments(new Set());
    try {
      const coords = await geocodePhilippineLocation(locationLabel);
      if (!coords) {
        setMarketAnalysis(null);
        return;
      }
      const result = await analyzeMarket({
        businessType,
        locationLabel,
        lat: coords.lat,
        lng: coords.lng,
      });
      setMarketAnalysis(result);
      if (user?.uid) {
        // Fire-and-forget: the onboarding flow shouldn't block on this write.
        saveMarketAnalysis(user.uid, { businessType, locationLabel, lat: coords.lat, lng: coords.lng }, result).catch(
          (e) => console.warn('Could not save market analysis:', e)
        );
      }
    } finally {
      setAnalyzingMarket(false);
    }
  };

  // ----------------------------------------------------
  // Dynamic Cascading Location Listeners (PSGC API)
  // ----------------------------------------------------
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
      const bType = selectedCategory === 'other' ? customCategory : selectedCategory;
      runMarketAnalysis(bType || 'Business', selectedCity.name);
    } else {
      setBarangaysList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runMarketAnalysis is stable per render and re-adding it would refire this on every keystroke elsewhere in the form
  }, [selectedCity, selectedCategory, customCategory]);

  // Detect GPS Location
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
          setSelectedBarangay(result.barangay || brgys[0]);
        }
      }
    }

    setLocationDetectedText(result.accuracyText);

    if (result.city) {
      const bType = selectedCategory === 'other' ? customCategory : selectedCategory;
      runMarketAnalysis(bType || 'Business', result.city.name);
    }
  };

  // Helper Multi-select Toggle
  const toggleArrayItem = (arr: string[], item: string) => {
    if (arr.includes(item)) return arr.filter((i) => i !== item);
    return [...arr, item];
  };

  // Check if current step CTA is enabled
  const isStepValid = () => {
    if (step === 1) return !!selectedCategory && (selectedCategory !== 'other' || !!customCategory.trim());
    if (step === 2) return !!selectedStage;
    if (step === 3) return !!selectedRegion && !!selectedCity;
    if (step === 4) return selectedCustomers.length > 0 && !!researchStage;
    if (step === 5) return !!startingBudget && !!cashRunway;
    if (step === 6) return !!registrationType;
    if (step === 7) return true; // Skippable step
    return true;
  };

  // Finish Onboarding & Run AI Plan Building Screen
  const handleFinishOnboarding = async () => {
    animateToStep(8); // Building Plan Screen

    // Progressive checklist timer
    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setBuildingStep(i);
    }

    await new Promise((r) => setTimeout(r, 400));

    try {
      const finalCategory = selectedCategory === 'other' ? customCategory.trim() : selectedCategory;
      // shortName over name: for Metro Manila, `name` deliberately lists every
      // city in the district (e.g. "Metro Manila (Second District - QC,
      // Mandaluyong, Marikina, Pasig, San Juan)") so it's identifiable in the
      // picker — far too long to store as the user's actual location text.
      const locationString = selectedCity ? `${selectedCity.name}, ${selectedProvince?.shortName || selectedProvince?.name || 'Philippines'}` : 'Philippines';

      // The complete set of answers from every step, used both as the
      // persisted record of this user's onboarding and to tailor their
      // generated roadmap below.
      const finalAnswers: OnboardingAnswers = {
        selectedCategory,
        customCategory,
        businessNameInput,
        selectedStage,
        selectedRegion,
        selectedProvince,
        selectedCity,
        selectedBarangay,
        selectedCustomers,
        differentiator,
        researchStage,
        startingBudget,
        fundingSources,
        cashRunway,
        registrationType,
        obtainedPermits,
        insuranceStatus,
        selectedRisks,
        extraAnswers,
        aiTailored: profileFromAI,
      };

      // 1. Sync User Profile in Supabase, including the finalized answers
      if (user) {
        const { error: profileSyncError } = await syncUserProfile({
          id: user.uid,
          email: userProfile?.email || user.email || '',
          full_name: userProfile?.full_name || 'Entrepreneur',
          business_name: businessNameInput.trim() || `${finalCategory} Venture`,
          business_type: finalCategory,
          budget: startingBudget,
          location: locationString,
          onboarded: true,
          onboarding_step: 8,
          onboarding_draft: JSON.stringify(finalAnswers),
        });

        if (profileSyncError) {
          // If `onboarded: true` never actually reaches Supabase, the local
          // state below still says "done" for this session — but the next
          // time AuthContext fetches this profile (a reload, another
          // device, a fresh web session) it reads the real row, sees
          // onboarded still false, and sends the user straight back through
          // onboarding despite having just finished it. Surface the failure
          // and let them retry instead of silently pretending it worked.
          throw profileSyncError;
        }

        // 2. Generate the default checklist, then tailor it to this user's
        //    actual answers (skip permits already obtained, swap DTI for SEC
        //    when incorporating, append a risk-contingency task), and save it.
        const defaultTasks: RoadmapTask[] = getDefaultPhilippineRoadmapTasks(
          user.uid,
          finalCategory,
          locationString,
          activeProfile
        );
        const roadmapTasks: RoadmapTask[] = tailorRoadmapTasks(defaultTasks, finalAnswers, riskContingencies);
        const { error: roadmapError } = await saveUserRoadmap(roadmapTasks);
        if (roadmapError) {
          // Non-fatal: saveUserRoadmap already writes the tailored tasks to
          // the local cache before it touches Supabase, so the roadmap tab
          // still has the right, tailored content even if this sync failed.
          console.warn('[Onboarding] Roadmap sync to Supabase failed, continuing on local cache:', roadmapError);
        }
      }

      setUserProfile({
        id: user?.uid || '1',
        email: userProfile?.email || '',
        full_name: userProfile?.full_name || 'Entrepreneur',
        business_name: businessNameInput.trim() || `${finalCategory} Venture`,
        business_type: finalCategory,
        budget: startingBudget,
        location: locationString,
        onboarded: true,
        onboarding_step: 8,
      });

      setOnboardingCompleted(true);
      router.replace('/suppliers');
    } catch (e) {
      console.warn('Onboarding save failed:', e);
      // Send them back to the last real step (not stuck on the "Building
      // your plan" loader) so Finish can be tapped again once whatever
      // failed (usually connectivity) is resolved.
      animateToStep(7);
      Alert.alert(
        "Couldn't save your setup",
        "We weren't able to save your onboarding to the cloud, so it won't stick yet. Check your connection and tap Finish again."
      );
    }
  };

  // ----------------------------------------------------
  // STEP 8: FULL SCREEN AI PROCESSING BUILDER
  // ----------------------------------------------------
  if (step === 8) {
    const checklistItems = [
      'Reading your business idea',
      'Checking your location & foot traffic',
      'Reviewing your starting budget',
      'Listing required Philippine permits',
      'Writing your risk contingency plan',
      'Building your personalized launch roadmap',
    ];

    return (
      <SafeAreaView style={styles.buildingSafeArea}>
        <View style={styles.buildingContainer}>
          <View style={styles.buildingIconBadge}>
            <Sparkles size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.buildingTitle}>Building your business plan</Text>
          <Text style={styles.buildingSub}>
            Likhora AI is processing your answers to curate your custom Philippines launch roadmap.
          </Text>

          <View style={styles.buildingChecklist}>
            {checklistItems.map((item, idx) => {
              const isDone = buildingStep > idx;
              const isActive = buildingStep === idx;

              return (
                <View
                  key={idx}
                  style={[
                    styles.buildingRow,
                    !isDone && !isActive && { opacity: 0.35 },
                  ]}
                >
                  <View style={styles.buildingStatusIcon}>
                    {isDone ? (
                      <CheckCircle2 size={20} color={LikhoraColors.successGreen} />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={LikhoraColors.primary} />
                    ) : (
                      <View style={styles.buildingDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.buildingItemText,
                      isDone && { color: LikhoraColors.textPrimary, fontWeight: '700' },
                      isActive && { color: LikhoraColors.primary, fontWeight: '700' },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // MAIN 7-STEP ONBOARDING RENDER
  // ----------------------------------------------------
  // The five most common Philippine micro-businesses, plus a custom option.
  // Deliberately short: a long list makes people pick the closest wrong thing,
  // and everything outside these five is better served by Khora building a
  // profile around what the user actually types.
  const CATEGORY_OPTIONS = [
    ...BUSINESS_PROFILES.map((profile) => ({
      id: profile.id,
      label: profile.label,
      icon: PROFILE_ICONS[profile.iconName],
      desc: profile.desc,
    })),
    { id: CUSTOM_BUSINESS_ID, label: 'Something else', icon: PlusCircle, desc: 'Tell us, and Khora tailors the rest' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* 1. PERSISTENT TOP NAVIGATION */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => {
              if (step > 1) animateToStep(step - 1);
              else if (router.canGoBack()) router.back();
              else router.replace('/login');
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.stepIndicatorText}>Step {step} of 7</Text>

          {step === 7 ? (
            <TouchableOpacity onPress={() => handleFinishOnboarding()} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Persistent Animated Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* 2. ANIMATED STEP CONTENT */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            
            {/* STEP 1: YOUR BUSINESS */}
            {step === 1 && (
              <View>
                <Text style={styles.eyebrow}>YOUR BUSINESS</Text>
                <Text style={styles.stepTitle}>What business are you planning to start?</Text>

                <View style={styles.optionsList}>
                  {CATEGORY_OPTIONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedCategory === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedCategory(item.id)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.iconTile,
                            isSelected && styles.iconTileSelected,
                          ]}
                        >
                          <IconComp
                            size={22}
                            color={isSelected ? '#FFFFFF' : LikhoraColors.primary}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.optionCaption}>{item.desc}</Text>
                        </View>

                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Conditional "Please specify" Text Input */}
                {selectedCategory === 'other' && (
                  <View style={styles.specifyBox}>
                    <Text style={styles.questionLabel}>Please specify your business</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Hydroponics Farm, Pet Grooming..."
                      placeholderTextColor={LikhoraColors.textPlaceholder}
                      value={customCategory}
                      onChangeText={setCustomCategory}
                    />
                  </View>
                )}

                {/* Optional Business Name */}
                <View style={styles.optionalBox}>
                  <Text style={styles.questionLabel}>What would you like to call your business? (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Aling Nena's Carinderia"
                    placeholderTextColor={LikhoraColors.textPlaceholder}
                    value={businessNameInput}
                    onChangeText={setBusinessNameInput}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: YOUR STAGE */}
            {step === 2 && (
              <View>
                <Text style={styles.eyebrow}>YOUR STAGE</Text>
                <Text style={styles.stepTitle}>Where are you right now?</Text>

                <View style={styles.optionsList}>
                  {[
                    { id: 'idea', label: 'Just an idea', desc: "I have a business idea but haven't started planning yet." },
                    { id: 'planning', label: 'Planning it out', desc: 'I am organizing my budget, permits, and supplier contacts.' },
                    { id: 'preparing', label: 'Preparing to open', desc: 'I have my location and setup ready to open soon.' },
                    { id: 'selling', label: 'Already selling', desc: 'I am already serving customers and making sales.' },
                  ].map((item) => {
                    const isSelected = selectedStage === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedStage(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.optionCaption}>{item.desc}</Text>
                        </View>

                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 3: LOCATION */}
            {step === 3 && (
              <View>
                <Text style={styles.eyebrow}>LOCATION</Text>
                <Text style={styles.stepTitle}>Where will you set up?</Text>

                {loadingLocationList && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <ActivityIndicator size="small" color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, color: LikhoraColors.textSecondary }}>Loading location choices...</Text>
                  </View>
                )}

                {/* Cascading Philippine Location Dropdowns */}
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

                {/* Market & Location Analysis Card */}
                {analyzingMarket && (
                  <View style={styles.aiLocationCard}>
                    <View style={styles.aiLocHeader}>
                      <ActivityIndicator size="small" color="#0EA5E9" />
                      <Text style={[styles.metaLocText, { marginLeft: 8 }]}>
                        Checking nearby businesses and reviews...
                      </Text>
                    </View>
                  </View>
                )}

                {!analyzingMarket && marketAnalysis && (
                  <View style={styles.aiLocationCard}>
                    <View style={styles.aiLocHeader}>
                      <View
                        style={[
                          styles.saturationBadge,
                          marketAnalysis.saturationSignal === 'opportunity' && styles.saturationOpportunity,
                          marketAnalysis.saturationSignal === 'crowded' && styles.saturationCrowded,
                        ]}
                      >
                        <Text style={styles.saturationBadgeText}>
                          {marketAnalysis.saturationSignal === 'opportunity'
                            ? 'Opportunity'
                            : marketAnalysis.saturationSignal === 'crowded'
                            ? 'Crowded'
                            : marketAnalysis.saturationSignal === 'balanced'
                            ? 'Balanced'
                            : 'Unclear'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verdictText}>
                          {marketAnalysis.competitorCount} similar business{marketAnalysis.competitorCount === 1 ? '' : 'es'} nearby
                        </Text>
                        <Text style={styles.metaLocText}>
                          {marketAnalysis.avgCompetitorRating != null
                            ? `Avg. rating ${marketAnalysis.avgCompetitorRating} ★ (${marketAnalysis.avgReviewCount ?? 0} reviews avg.)`
                            : 'No review data available nearby'}
                          {marketAnalysis.source === 'offline' ? ' · offline estimate' : ''}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.aiLocRecText}>{marketAnalysis.recommendation}</Text>

                    {marketAnalysis.suggestedTargetMarket.segments.length > 0 && (
                      <View style={styles.segmentsWrap}>
                        <Text style={styles.segmentsTitle}>Suggested target market</Text>
                        <Text style={styles.aiLocRecText}>{marketAnalysis.suggestedTargetMarket.summary}</Text>
                        <View style={styles.segmentChipsRow}>
                          {marketAnalysis.suggestedTargetMarket.segments.map((seg, idx) => {
                            const key = `${seg.label}-${idx}`;
                            const needsConfirm = seg.requiresAcceptabilityConfirmation && !confirmedSegments.has(key);
                            return (
                              <TouchableOpacity
                                key={key}
                                style={[styles.segmentChip, needsConfirm && styles.segmentChipPending]}
                                onPress={() => {
                                  if (!seg.requiresAcceptabilityConfirmation) return;
                                  setConfirmedSegments((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                              >
                                <Text style={styles.segmentChipText}>
                                  {seg.label} ({seg.ageRange})
                                </Text>
                                {needsConfirm && (
                                  <Text style={styles.segmentChipWarn}>Tap to confirm this age group</Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Location Accuracy Disclaimer */}
                <View style={styles.disclaimerRow}>
                  <Info size={16} color={LikhoraColors.textSecondary} style={{ marginRight: 6, marginTop: 2 }} />
                  <Text style={styles.disclaimerText}>
                    AI and location data may not always be accurate. Please check the actual location before making business decisions.
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 4: MARKET & PRODUCT */}
            {step === 4 && (
              <View>
                <Text style={styles.eyebrow}>
                  {activeProfile.isProductBased ? 'MARKET & PRODUCT' : 'MARKET & SERVICE'}
                </Text>
                <Text style={styles.stepTitle}>
                  {activeProfile.isProductBased ? 'Who will buy from you?' : 'Who will book your service?'}
                </Text>

                {/* A custom business type has its questions written by Khora,
                    which takes a moment — say so rather than briefly showing
                    generic options and swapping them out underneath the user. */}
                {generatingProfile && (
                  <View style={styles.tailoringCard}>
                    <ActivityIndicator size="small" color={LikhoraColors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.tailoringText}>
                      Khora is tailoring these questions for your {customCategory.trim() || 'business'}...
                    </Text>
                  </View>
                )}

                {!generatingProfile && profileFromAI && (
                  <View style={styles.tailoredBadge}>
                    <Sparkles size={13} color={LikhoraColors.aiBlue} style={{ marginRight: 6 }} />
                    <Text style={styles.tailoredBadgeText}>
                      Khora tailored these questions for {activeProfile.label}
                    </Text>
                  </View>
                )}

                <View style={styles.optionsList}>
                  {activeProfile.customerSegments.map((group) => {
                    const isSelected = selectedCustomers.includes(group);
                    return (
                      <TouchableOpacity
                        key={group}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedCustomers(toggleArrayItem(selectedCustomers, group))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {group}
                        </Text>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>
                    {activeProfile.isProductBased
                      ? 'What makes your business different?'
                      : 'Why will they choose you?'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder={activeProfile.differentiatorPlaceholder}
                    placeholderTextColor={LikhoraColors.textPlaceholder}
                    value={differentiator}
                    onChangeText={setDifferentiator}
                    multiline
                  />
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>How far have you gone with your market research?</Text>
                  <View style={styles.optionsList}>
                    {activeProfile.researchStages.map((item) => {
                      const isSelected = researchStage === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setResearchStage(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {item.label}
                          </Text>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Questions that only make sense for THIS kind of business —
                    hand-written for the five built-in types, generated by
                    Khora for anything else. */}
                {activeProfile.extraQuestions.map((question) => (
                  <View key={question.id} style={styles.questionGroup}>
                    <Text style={styles.questionLabel}>{question.label}</Text>
                    {question.type === 'text' ? (
                      <TextInput
                        style={styles.textInput}
                        placeholder={question.placeholder || 'Your answer...'}
                        placeholderTextColor={LikhoraColors.textPlaceholder}
                        value={extraAnswers[question.id] || ''}
                        onChangeText={(text) => setExtraAnswers({ ...extraAnswers, [question.id]: text })}
                      />
                    ) : (
                      <View style={styles.optionsList}>
                        {(question.options || []).map((option) => {
                          const isSelected = extraAnswers[question.id] === option;
                          return (
                            <TouchableOpacity
                              key={option}
                              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                              onPress={() => setExtraAnswers({ ...extraAnswers, [question.id]: option })}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                {option}
                              </Text>
                              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* STEP 5: MONEY & FINANCES */}
            {step === 5 && (
              <View>
                <Text style={styles.eyebrow}>MONEY & FINANCES</Text>
                <Text style={styles.stepTitle}>How much can you start with?</Text>

                <View style={styles.optionsList}>
                  {[
                    'Below ₱5,000',
                    '₱5,000–₱10,000',
                    '₱10,001–₱25,000',
                    '₱25,001–₱50,000',
                    '₱50,001–₱100,000',
                    'More than ₱100,000',
                    'Not sure yet',
                  ].map((range) => {
                    const isSelected = startingBudget === range;
                    return (
                      <TouchableOpacity
                        key={range}
                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        onPress={() => setStartingBudget(range)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {range}
                        </Text>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>Funding sources (Multi-select)</Text>
                  <View style={styles.optionsList}>
                    {['Personal savings', 'Family', 'Loan', 'Business partner', 'Grant / program'].map((source) => {
                      const isSelected = fundingSources.includes(source);
                      return (
                        <TouchableOpacity
                          key={source}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setFundingSources(toggleArrayItem(fundingSources, source))}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {source}
                          </Text>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>Cash runway (Extra reserve cash)</Text>
                  <View style={styles.optionsList}>
                    {[
                      'No extra cash',
                      'Less than 1 month',
                      '1–3 months',
                      '3–6 months',
                      '6 months or more',
                      'Not sure',
                    ].map((rw) => {
                      const isSelected = cashRunway === rw;
                      return (
                        <TouchableOpacity
                          key={rw}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setCashRunway(rw)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {rw}
                          </Text>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 6: LAW & SETUP */}
            {step === 6 && (
              <View>
                <Text style={styles.eyebrow}>LAW & SETUP</Text>
                <Text style={styles.stepTitle}>How do you plan to register your business?</Text>

                <View style={styles.optionsList}>
                  {[
                    { id: 'sole', label: 'Sole Proprietor', desc: 'Owned by 1 person. Easiest to register via DTI.' },
                    { id: 'partnership', label: 'Partnership', desc: 'Owned by 2 or more partners.' },
                    { id: 'corporation', label: 'Corporation', desc: 'Separate legal entity via SEC.' },
                    { id: 'not_sure', label: 'Not sure — let Likhora recommend', desc: 'We will suggest based on your budget.' },
                  ].map((item) => {
                    const isSelected = registrationType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        onPress={() => setRegistrationType(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {item.label}
                          </Text>
                          <Text style={styles.optionCaption}>{item.desc}</Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>Permits already obtained (Multi-select)</Text>
                  <Text style={styles.reassuranceText}>
                    Leave blank if you haven't started yet — we'll add what you need to your roadmap.
                  </Text>
                  <View style={styles.optionsList}>
                    {activeProfile.permits.map((p) => {
                      const isSelected = obtainedPermits.includes(p);
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setObtainedPermits(toggleArrayItem(obtainedPermits, p))}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                              {p}
                            </Text>
                            <Text style={styles.optionCaption}>{getPermitCaption(p)}</Text>
                          </View>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>Insurance status</Text>
                  <View style={styles.optionsList}>
                    {['Already have insurance', 'Looking into it', 'Not yet', 'Not sure'].map((ins) => {
                      const isSelected = insuranceStatus === ins;
                      return (
                        <TouchableOpacity
                          key={ins}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setInsuranceStatus(ins)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {ins}
                          </Text>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 7: RISKS & BACKUP PLAN */}
            {step === 7 && (
              <View>
                <Text style={styles.eyebrow}>RISKS & BACKUP PLAN</Text>
                <Text style={styles.stepTitle}>What worries you most about starting?</Text>
                <Text style={styles.stepSubTitle}>Select all that apply. We will generate instant contingency plans.</Text>

                <View style={styles.optionsList}>
                  {activeProfile.risks.map(({ risk }) => {
                    const isSelected = selectedRisks.includes(risk);
                    return (
                      <TouchableOpacity
                        key={risk}
                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        onPress={() => setSelectedRisks(toggleArrayItem(selectedRisks, risk))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {risk}
                        </Text>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Live Generated Contingency Plan Card */}
                {selectedRisks.length > 0 && (
                  <View style={styles.contingencyCard}>
                    <View style={styles.contingencyHeader}>
                      <ShieldAlert size={20} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.contingencyTitle}>Your contingency plan so far</Text>
                    </View>

                    {selectedRisks.map((risk) => (
                      <View key={risk} style={styles.contingencyItem}>
                        <Text style={styles.contingencyRiskLabel}>Risk: {risk}</Text>
                        <Text style={styles.contingencyActionText}>
                          Action: {riskContingencies[risk]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          </Animated.View>
        </ScrollView>

        {/* 3. PERSISTENT BOTTOM CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.primaryCta,
              !isStepValid() && styles.primaryCtaDisabled,
            ]}
            onPress={() => {
              if (step < 7) {
                // Start Khora's custom-profile build now, so the tailored
                // questions on step 4 are usually ready before the user is.
                if (step === 1) ensureCustomProfile();
                animateToStep(step + 1);
              } else {
                handleFinishOnboarding();
              }
            }}
            disabled={!isStepValid() || loading}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.primaryCtaText,
                !isStepValid() && styles.primaryCtaTextDisabled,
              ]}
            >
              {step === 7 ? 'Build My Business Plan' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  navBackBtn: {
    padding: 6,
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: LikhoraColors.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: 90,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    lineHeight: 34,
    marginBottom: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepSubTitle: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  optionsList: {
    gap: 12,
    marginBottom: Spacing.four,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.xlarge,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 56,
  },
  optionCardSelected: {
    borderColor: LikhoraColors.primary,
    backgroundColor: LikhoraColors.secondaryLavender,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LikhoraColors.secondaryLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconTileSelected: {
    backgroundColor: LikhoraColors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  optionLabelSelected: {
    color: LikhoraColors.primary,
  },
  optionCaption: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: LikhoraColors.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleSelected: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: LikhoraColors.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkboxSelected: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  specifyBox: {
    marginBottom: Spacing.four,
  },
  optionalBox: {
    marginBottom: Spacing.four,
  },
  questionGroup: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  textInput: {
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  reassuranceText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: 10,
    fontStyle: 'italic',
    fontFamily: LikhoraFont.fontFamily,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    borderRadius: Radius.xlarge,
    paddingVertical: 14,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  detectedNoticeText: {
    fontSize: 12,
    color: LikhoraColors.successGreen,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: LikhoraFont.fontFamily,
  },
  aiLocationCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginVertical: Spacing.three,
  },
  aiLocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
    fontFamily: LikhoraFont.fontFamily,
  },
  metaLocText: {
    fontSize: 12,
    color: '#0284C7',
    fontFamily: LikhoraFont.fontFamily,
  },
  aiLocRecText: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  saturationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: '#0EA5E9',
    marginRight: 10,
  },
  saturationOpportunity: {
    backgroundColor: '#16A34A',
  },
  saturationCrowded: {
    backgroundColor: '#D97706',
  },
  saturationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentsWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
  },
  segmentsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 4,
  },
  segmentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  segmentChip: {
    backgroundColor: '#E0F2FE',
    borderRadius: Radius.large,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  segmentChipPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  segmentChipText: {
    fontSize: 12,
    color: '#0C4A6E',
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentChipWarn: {
    fontSize: 10,
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: Spacing.four,
  },
  disclaimerText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    flex: 1,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  tailoringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  tailoringText: {
    flex: 1,
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  tailoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.three,
    alignSelf: 'flex-start',
  },
  tailoredBadgeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyCard: {
    backgroundColor: LikhoraColors.primarySoft,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
    marginTop: Spacing.three,
  },
  contingencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contingencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyItem: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: Radius.medium,
  },
  contingencyRiskLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyActionText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  primaryCta: {
    height: 52,
    borderRadius: Radius.xlarge,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaDisabled: {
    backgroundColor: LikhoraColors.secondaryLavender,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  primaryCtaTextDisabled: {
    color: LikhoraColors.textPlaceholder,
  },

  // Building Screen Styles (Step 8)
  buildingSafeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.primary,
  },
  buildingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  buildingIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  buildingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  buildingSub: {
    fontSize: 14,
    color: '#F3E8FF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.two,
    fontFamily: LikhoraFont.fontFamily,
  },
  buildingChecklist: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    gap: 14,
  },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildingStatusIcon: {
    width: 24,
    marginRight: 10,
    alignItems: 'center',
  },
  buildingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  buildingItemText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
});
