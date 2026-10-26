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
  Alert,
  Modal
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
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  Users,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Flame,
  ShieldCheck,
  MoveHorizontal,
  MessageSquareQuote,
  Droplets
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  syncUserProfile,
  saveUserRoadmap,
  replaceUserRoadmap,
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
  buildCustomBusinessProfile,
} from '@/services/businessProfiles';
import { getStartupTemplateForBusinessType } from '@/services/startupTemplates';
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
import { analyzeMarket, saveMarketAnalysis, MarketAnalysisResult, DemographicSegment } from '@/services/marketAnalysis';
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
  droplets: Droplets,
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

  // STEP 2 State: Stage & Experience Level
  const [selectedStage, setSelectedStage] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('First-time entrepreneur');

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
  const [scannedLocationLabel, setScannedLocationLabel] = useState<string>('');
  const [marketTab, setMarketTab] = useState<'competitors' | 'insights' | 'demographics'>('competitors');
  // Segments the AI flagged as needing explicit confirmation (under-18) before
  // they're treated as part of the target market — never assumed silently.
  const [confirmedSegments, setConfirmedSegments] = useState<Set<string>>(new Set());
  const [expandedCompetitors, setExpandedCompetitors] = useState(false);
  const [minorModalVisible, setMinorModalVisible] = useState(false);
  const [pendingMinorSegment, setPendingMinorSegment] = useState<DemographicSegment | null>(null);
  const [customCustomerText, setCustomCustomerText] = useState('');

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
  const [activeContingencyIndex, setActiveContingencyIndex] = useState(0);

  // Floating in-app toast notification state (no browser window.alert popups)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    Animated.parallel([
      Animated.spring(toastAnim, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      hideToast();
    }, 3500);
  };

  const hideToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    Animated.parallel([
      Animated.timing(toastAnim, {
        toValue: -80,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

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
          if (draft.experienceLevel) setExperienceLevel(draft.experienceLevel);
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
      return customProfile || buildCustomBusinessProfile(typed || GENERIC_PROFILE.id);
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
    hideToast();
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
        experienceLevel,
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
        experience_level: experienceLevel,
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
    setScannedLocationLabel(locationLabel);
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

  // Fetch barangays whenever selected city changes
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

  // Dynamic market & competitor analysis scanner:
  // Dynamically re-scans whenever user changes city, selects/changes barangay, or changes category
  useEffect(() => {
    if (!selectedCity) {
      setMarketAnalysis(null);
      setScannedLocationLabel('');
      return;
    }

    const bType = selectedCategory === 'other' ? customCategory : selectedCategory;
    const businessName = bType || 'Business';

    let locationLabel = selectedCity.name;
    if (selectedBarangay) {
      locationLabel = `Barangay ${selectedBarangay.name}, ${selectedCity.name}${selectedProvince ? `, ${selectedProvince.name}` : ''}`;
    } else if (selectedProvince) {
      locationLabel = `${selectedCity.name}, ${selectedProvince.name}`;
    }

    runMarketAnalysis(businessName, locationLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarangay, selectedCity, selectedCategory, customCategory]);

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
          const matchedBrgy = result.barangay || brgys[0];
          setSelectedBarangay(matchedBrgy);
          // Setting selectedBarangay will automatically trigger the market scanner effect for the detected barangay!
        }
      }
    }

    setLocationDetectedText(result.accuracyText);
  };

  // Helper Multi-select Toggle
  const toggleArrayItem = (arr: string[], item: string) => {
    if (arr.includes(item)) return arr.filter((i) => i !== item);
    return [...arr, item];
  };

  const handleToggleDemographicSegment = (seg: DemographicSegment) => {
    const isSelected = selectedCustomers.includes(seg.label);
    if (isSelected) {
      setSelectedCustomers(selectedCustomers.filter((item) => item !== seg.label));
      return;
    }
    // If selecting, check if under-18 or requires acceptability confirmation
    if (seg.requiresAcceptabilityConfirmation && !confirmedSegments.has(seg.label)) {
      setPendingMinorSegment(seg);
      setMinorModalVisible(true);
      return;
    }
    setSelectedCustomers([...selectedCustomers, seg.label]);
  };

  const handleConfirmMinorAcceptance = () => {
    if (pendingMinorSegment) {
      setConfirmedSegments((prev) => new Set(prev).add(pendingMinorSegment.label));
      if (!selectedCustomers.includes(pendingMinorSegment.label)) {
        setSelectedCustomers((prev) => [...prev, pendingMinorSegment.label]);
      }
    }
    setMinorModalVisible(false);
    setPendingMinorSegment(null);
  };

  const handleAddCustomCustomer = () => {
    const trimmed = customCustomerText.trim();
    if (!trimmed) return;
    if (!selectedCustomers.includes(trimmed)) {
      setSelectedCustomers([...selectedCustomers, trimmed]);
    }
    setCustomCustomerText('');
  };

  // Check if current step CTA is enabled and provide inline validation error feedback
  const getStepValidationError = () => {
    if (step === 1) {
      if (!selectedCategory) return 'Please select a business type to continue.';
      if (selectedCategory === 'other' && !customCategory.trim()) return 'Please enter what type of business you want to start.';
    }
    if (step === 2) {
      if (!selectedStage) return 'Please select where you are right now (your stage).';
      if (!experienceLevel) return 'Please select your entrepreneurial experience level.';
    }
    if (step === 3) {
      if (!selectedRegion) return 'Please select your region.';
      if (!selectedCity) return 'Please select your city or municipality.';
    }
    if (step === 4) {
      if (selectedCustomers.length === 0) return 'Please select at least one customer group.';
      if (!researchStage) return 'Please select your market research progress.';
    }
    if (step === 5) {
      if (!startingBudget) return 'Please select your starting capital range.';
      if (!cashRunway) return 'Please select your cash runway.';
    }
    if (step === 6) {
      if (!registrationType) return 'Please select how you plan to register your business.';
    }
    return null;
  };

  const isStepValid = () => !getStepValidationError();

  // Automatically dismiss toast once user satisfies the step requirement
  useEffect(() => {
    if (toastMessage && isStepValid()) {
      hideToast();
    }
  }, [
    step,
    selectedCategory,
    customCategory,
    selectedStage,
    experienceLevel,
    selectedRegion,
    selectedCity,
    selectedCustomers,
    researchStage,
    startingBudget,
    cashRunway,
    registrationType,
    toastMessage,
  ]);

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
        experienceLevel,
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
          experience_level: experienceLevel,
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

        // 2. Generate roadmap: use pre-built Philippine startup template (e.g. Carinderia, Sari-sari)
        //    if available, otherwise fallback to standard default checklist, then tailor with issuing offices & tips.
        let baseTasks: RoadmapTask[];
        const matchedTemplate = getStartupTemplateForBusinessType(finalCategory);
        if (matchedTemplate && matchedTemplate.tasks && matchedTemplate.tasks.length > 0) {
          baseTasks = matchedTemplate.tasks.map((t, idx) => ({
            ...t,
            id: String(idx + 1),
            user_id: user.uid,
            status: t.status || 'Pending',
          }));
        } else {
          baseTasks = getDefaultPhilippineRoadmapTasks(
            user.uid,
            finalCategory,
            locationString,
            activeProfile
          );
        }

        const roadmapTasks: RoadmapTask[] = tailorRoadmapTasks(baseTasks, finalAnswers, riskContingencies);
        const { error: roadmapError } = await replaceUserRoadmap(user.uid, roadmapTasks);
        if (roadmapError) {
          // Non-fatal: replaceUserRoadmap already writes the tailored tasks to
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
        experience_level: experienceLevel,
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
      {/* Floating In-App Validation Toast (Slides down from top) */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.floatingToast,
            {
              transform: [{ translateY: toastAnim }],
              opacity: toastOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingToastContent}
            onPress={hideToast}
            activeOpacity={0.9}
          >
            <AlertTriangle size={18} color="#F87171" style={{ marginRight: 10, flexShrink: 0 }} />
            <Text style={styles.floatingToastText}>{toastMessage}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

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

            {/* STEP 2: YOUR STAGE & EXPERIENCE */}
            {step === 2 && (
              <View>
                <Text style={styles.eyebrow}>YOUR STAGE & EXPERIENCE</Text>
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

                {/* Entrepreneurial Experience Level (TS-01 & TC_ROADMAP_001) */}
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.questionLabel}>What is your entrepreneurial experience?</Text>
                  <Text style={styles.reassuranceText}>
                    We will customize your permit requirements, legal tips, and guide tooltips based on your experience.
                  </Text>

                  <View style={styles.optionsList}>
                    {[
                      {
                        id: 'First-time entrepreneur',
                        label: 'First-time entrepreneur',
                        desc: 'This is my first time starting a business in the Philippines. I need step-by-step guidance and beginner tips.',
                      },
                      {
                        id: 'Experienced owner',
                        label: 'Experienced owner',
                        desc: 'I have owned or operated a business before and am familiar with government permits.',
                      },
                    ].map((item) => {
                      const isSelected = experienceLevel === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.optionCard,
                            isSelected && styles.optionCardSelected,
                          ]}
                          onPress={() => setExperienceLevel(item.id)}
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
                    <View style={styles.aiRadarScanningHeader}>
                      <View style={styles.radarPulseBox}>
                        <ActivityIndicator size="small" color="#42143E" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.radarScanningTitle}>
                          Scanning {selectedBarangay ? `Brgy. ${selectedBarangay.name}` : selectedCity?.name || 'Local Area'}
                        </Text>
                        <Text style={styles.radarScanningSub}>
                          Analyzing Google Places, local competitors & authentic reviews...
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {!analyzingMarket && marketAnalysis && (
                  <View style={styles.aiLocationCard}>
                    {/* 1. Location Header & Saturation Status */}
                    <View style={styles.deckHeader}>
                      <View style={styles.deckHeaderTopRow}>
                        <View style={styles.deckLocationBadge}>
                          <MapPin size={12} color="#64748B" style={{ marginRight: 4, flexShrink: 0 }} />
                          <Text style={styles.deckLocationBadgeText} numberOfLines={1} ellipsizeMode="tail">
                            {selectedBarangay
                              ? `Brgy. ${selectedBarangay.name}, ${selectedCity?.name || ''}`
                              : selectedCity?.name || 'Local Area'}
                          </Text>
                        </View>

                        {/* Viability Pill - Vector Icon, No Emojis */}
                        <View
                          style={[
                            styles.deckVerdictPill,
                            (marketAnalysis.competitorCount === 0 || marketAnalysis.saturationSignal === 'opportunity') && styles.deckVerdictOpportunity,
                            marketAnalysis.saturationSignal === 'crowded' && styles.deckVerdictCrowded,
                            marketAnalysis.saturationSignal === 'balanced' && styles.deckVerdictBalanced,
                          ]}
                        >
                          {(marketAnalysis.competitorCount === 0 || marketAnalysis.saturationSignal === 'opportunity') ? (
                            <TrendingUp size={12} color="#166534" style={{ marginRight: 4 }} />
                          ) : marketAnalysis.saturationSignal === 'crowded' ? (
                            <Flame size={12} color="#92400E" style={{ marginRight: 4 }} />
                          ) : (
                            <ShieldCheck size={12} color="#334155" style={{ marginRight: 4 }} />
                          )}
                          <Text
                            style={[
                              styles.deckVerdictPillText,
                              (marketAnalysis.competitorCount === 0 || marketAnalysis.saturationSignal === 'opportunity') && styles.deckVerdictTextOpportunity,
                              marketAnalysis.saturationSignal === 'crowded' && styles.deckVerdictTextCrowded,
                              marketAnalysis.saturationSignal === 'balanced' && styles.deckVerdictTextBalanced,
                            ]}
                          >
                            {marketAnalysis.competitorCount === 0
                              ? 'Untapped Opportunity'
                              : marketAnalysis.saturationSignal === 'opportunity'
                              ? 'High Potential'
                              : marketAnalysis.saturationSignal === 'crowded'
                              ? 'Proven High Demand'
                              : 'Balanced Market'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.deckSubLabel}>
                        {marketAnalysis.competitorCount === 0
                          ? 'Uncontested zone · 0 competitors in 3km'
                          : `${marketAnalysis.competitorCount >= 20 ? '20+' : marketAnalysis.competitorCount} similar business${marketAnalysis.competitorCount === 1 ? '' : 'es'} within 3km`}
                      </Text>
                    </View>

                    {/* 2. Key Metrics Micro-Strip */}
                    <View style={styles.deckStatsRow}>
                      <View style={styles.deckStatItem}>
                        <Text style={styles.deckStatValue}>
                          {marketAnalysis.competitorCount >= 20 ? '20+' : marketAnalysis.competitorCount}
                        </Text>
                        <Text style={styles.deckStatLabel}>Nearby Stores</Text>
                      </View>
                      <View style={styles.deckStatDivider} />
                      <View style={styles.deckStatItem}>
                        <View style={styles.deckStatValueRow}>
                          <Text style={styles.deckStatValue}>
                            {marketAnalysis.avgCompetitorRating != null ? marketAnalysis.avgCompetitorRating.toFixed(1) : 'N/A'}
                          </Text>
                          {marketAnalysis.avgCompetitorRating != null && (
                            <Star size={11} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 3 }} />
                          )}
                        </View>
                        <Text style={styles.deckStatLabel}>Avg Rating</Text>
                      </View>
                      <View style={styles.deckStatDivider} />
                      <View style={styles.deckStatItem}>
                        <Text style={styles.deckStatValue}>
                          {marketAnalysis.avgReviewCount != null ? marketAnalysis.avgReviewCount : 0}
                        </Text>
                        <Text style={styles.deckStatLabel}>Avg Reviews</Text>
                      </View>
                    </View>

                    {/* 3. Segmented Switcher (Micro-Tabs) */}
                    <View style={styles.deckTabsRow}>
                      <TouchableOpacity
                        style={[styles.deckTabBtn, marketTab === 'competitors' && styles.deckTabBtnActive]}
                        onPress={() => setMarketTab('competitors')}
                        activeOpacity={0.8}
                      >
                        <Store
                          size={12}
                          color={marketTab === 'competitors' ? '#FFFFFF' : '#64748B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.deckTabBtnText, marketTab === 'competitors' && styles.deckTabBtnTextActive]}
                          numberOfLines={1}
                        >
                          Stores ({marketAnalysis.competitorCount >= 20 ? '20+' : marketAnalysis.competitorCount ?? marketAnalysis.competitors?.length ?? 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.deckTabBtn, marketTab === 'insights' && styles.deckTabBtnActive]}
                        onPress={() => setMarketTab('insights')}
                        activeOpacity={0.8}
                      >
                        <Lightbulb
                          size={12}
                          color={marketTab === 'insights' ? '#FFFFFF' : '#64748B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.deckTabBtnText, marketTab === 'insights' && styles.deckTabBtnTextActive]}
                          numberOfLines={1}
                        >
                          AI Insights
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.deckTabBtn, marketTab === 'demographics' && styles.deckTabBtnActive]}
                        onPress={() => setMarketTab('demographics')}
                        activeOpacity={0.8}
                      >
                        <Users
                          size={12}
                          color={marketTab === 'demographics' ? '#FFFFFF' : '#64748B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.deckTabBtnText, marketTab === 'demographics' && styles.deckTabBtnTextActive]}
                          numberOfLines={1}
                        >
                          Demographics
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 4. Tab 1: Horizontal Competitor Carousel */}
                    {marketTab === 'competitors' && (
                      <View style={styles.deckTabBody}>
                        {marketAnalysis.competitors && marketAnalysis.competitors.length > 0 ? (
                          <View>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.competitorsHorizontalList}
                            >
                              {marketAnalysis.competitors.map((comp, idx) => (
                                <View key={idx} style={styles.competitorCardHorizontal}>
                                  <View style={styles.compHeaderRow}>
                                    <View style={{ flex: 1, marginRight: 6 }}>
                                      <Text style={styles.compName} numberOfLines={1}>
                                        {comp.name}
                                      </Text>
                                      {comp.address ? (
                                        <Text style={styles.compAddress} numberOfLines={1}>
                                          {comp.address}
                                        </Text>
                                      ) : null}
                                    </View>
                                    {comp.rating != null && (
                                      <View style={styles.compRatingBadge}>
                                        <Star size={10} color="#B45309" fill="#B45309" style={{ marginRight: 3 }} />
                                        <Text style={styles.compRatingText}>
                                          {typeof comp.rating === 'number' ? comp.rating.toFixed(1) : comp.rating}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  {comp.sampleReview ? (
                                    <View style={styles.compReviewBubble}>
                                      <Text style={styles.compReviewQuote} numberOfLines={3}>
                                        "{comp.sampleReview}"
                                      </Text>
                                      <Text style={styles.compReviewAuthor}>
                                        — Customer Review ({comp.userRatingCount ?? 0} total)
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={styles.compNoReviewBubble}>
                                      <Text style={styles.compNoReviewText}>
                                        Verified business on Google Maps
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              ))}
                            </ScrollView>
                            <View style={styles.carouselSwipeHintRow}>
                              <MoveHorizontal size={12} color="#64748B" style={{ marginRight: 5 }} />
                              <Text style={styles.carouselSwipeHint}>
                                Swipe horizontally to view {marketAnalysis.competitorCount >= 20 ? 'the top 20' : `all ${marketAnalysis.competitors.length}`} competitors in this barangay
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.zeroCompetitorsBox}>
                            <View style={styles.zeroCompetitorsIconCircle}>
                              <TrendingUp size={20} color="#166534" />
                            </View>
                            <Text style={styles.zeroCompetitorsTitle}>
                              Zero Direct Competitors in {selectedBarangay ? `Brgy. ${selectedBarangay.name}` : selectedCity?.name}
                            </Text>
                            <Text style={styles.zeroCompetitorsDesc}>
                              No direct competitors found within a 3km radius. This is an ideal underserved area to capture local customer loyalty with first-mover advantage.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* 5. Tab 2: AI Insights & Viability */}
                    {marketTab === 'insights' && (
                      <View style={styles.deckTabBody}>
                        {marketAnalysis.untappedOpportunity ? (
                          <View style={styles.deckInsightCardOpportunity}>
                            <View style={styles.deckInsightCardTitleRow}>
                              <TrendingUp size={13} color="#166534" style={{ marginRight: 5 }} />
                              <Text style={styles.deckInsightCardTitleOpportunity}>Untapped Market Opportunity</Text>
                            </View>
                            <Text style={styles.deckInsightCardTextOpportunity}>
                              {marketAnalysis.untappedOpportunity}
                            </Text>
                          </View>
                        ) : null}

                        {marketAnalysis.businessStateSummary ? (
                          <View style={styles.deckInsightCardState}>
                            <View style={styles.deckInsightCardTitleRow}>
                              <MessageSquareQuote size={13} color="#0F172A" style={{ marginRight: 5 }} />
                              <Text style={styles.deckInsightCardTitleState}>Customer Feedback & Pain Points (Google Reviews)</Text>
                            </View>
                            <Text style={styles.deckInsightCardTextState}>
                              {marketAnalysis.businessStateSummary}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.deckRecommendationBox}>
                          <Text style={styles.deckRecTitle}>Strategic Advice</Text>
                          <Text style={styles.deckRecText}>{marketAnalysis.recommendation}</Text>
                        </View>
                      </View>
                    )}

                    {/* 6. Tab 3: Demographics */}
                    {marketTab === 'demographics' && (
                      <View style={styles.deckTabBody}>
                        <Text style={styles.deckDemoSummary}>
                          {marketAnalysis.suggestedTargetMarket.summary}
                        </Text>
                        <View style={styles.deckDemoList}>
                          {marketAnalysis.suggestedTargetMarket.segments.map((seg, idx) => {
                            const isMinor = seg.requiresAcceptabilityConfirmation || seg.ageRange.includes('1-18');
                            return (
                              <View key={idx} style={[styles.deckDemoItem, isMinor && styles.deckDemoItemMinor]}>
                                <View style={styles.deckDemoItemHeader}>
                                  <Text style={styles.deckDemoItemLabel}>{seg.label}</Text>
                                  <View style={styles.deckDemoItemBadges}>
                                    <View style={styles.deckDemoAgeBadge}>
                                      <Text style={styles.deckDemoAgeBadgeText}>{seg.ageRange} yrs</Text>
                                    </View>
                                    <View style={styles.deckDemoShareBadge}>
                                      <Text style={styles.deckDemoShareBadgeText}>{seg.shareEstimate}</Text>
                                    </View>
                                  </View>
                                </View>
                                <Text style={styles.deckDemoItemNote}>{seg.note}</Text>
                                {isMinor && (
                                  <View style={styles.deckDemoMinorNotice}>
                                    <Info size={11} color="#B45309" style={{ marginRight: 4 }} />
                                    <Text style={styles.deckDemoMinorNoticeText}>
                                      Includes minor consumers (aged 1-18) · Child safety standards apply
                                    </Text>
                                  </View>
                                )}
                              </View>
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

                {/* Custom business type profile tailoring status */}
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

                {/* SECTION 1: AI DEMOGRAPHIC SEGMENTS (SYSTEM RECOMMENDATION) */}
                {marketAnalysis?.suggestedTargetMarket?.segments && marketAnalysis.suggestedTargetMarket.segments.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <View style={styles.sectionHeaderWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Users size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.sectionHeaderTitle}>Demographic Segments (AI Recommendation)</Text>
                      </View>
                      <Text style={styles.sectionHeaderSub}>
                        {marketAnalysis.suggestedTargetMarket.summary || 'Target market segregated by demographic age groups based on local demand.'}
                      </Text>
                    </View>

                    <View style={styles.optionsList}>
                      {marketAnalysis.suggestedTargetMarket.segments.map((seg, idx) => {
                        const isSelected = selectedCustomers.includes(seg.label);
                        const isMinor = seg.requiresAcceptabilityConfirmation || seg.ageRange.includes('1-18');
                        const isConfirmed = confirmedSegments.has(seg.label);

                        return (
                          <TouchableOpacity
                            key={`${seg.label}-${idx}`}
                            style={[
                              styles.demographicCard,
                              isSelected && styles.demographicCardSelected,
                            ]}
                            onPress={() => handleToggleDemographicSegment(seg)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.demographicHeaderRow}>
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={[styles.demographicLabel, isSelected && styles.optionLabelSelected]}>
                                  {seg.label}
                                </Text>
                                <View style={[styles.demographicAgeBadge, isMinor && styles.minorAgeBadge]}>
                                  <Text style={[styles.demographicAgeBadgeText, isMinor && styles.minorAgeBadgeText]}>
                                    Age {seg.ageRange}
                                  </Text>
                                </View>
                                {seg.shareEstimate ? (
                                  <View style={styles.demographicShareBadge}>
                                    <Text style={styles.demographicShareBadgeText}>{seg.shareEstimate}</Text>
                                  </View>
                                ) : null}
                              </View>

                              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                              </View>
                            </View>

                            {seg.note ? (
                              <Text style={styles.demographicNote}>{seg.note}</Text>
                            ) : null}

                            {isMinor && (
                              <View style={[styles.demographicMinorNotice, isConfirmed && styles.demographicMinorNoticeConfirmed]}>
                                <ShieldAlert size={13} color={isConfirmed ? '#047857' : '#D97706'} style={{ marginRight: 4 }} />
                                <Text style={[styles.demographicMinorNoticeText, isConfirmed && styles.demographicMinorNoticeTextConfirmed]}>
                                  {isConfirmed
                                    ? 'Minor consumer acceptability confirmed'
                                    : 'Ages 1–18: Tap to confirm acceptability for minor consumers'}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* SECTION 2: GENERAL CUSTOMER PROFILES */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.questionLabel}>General Customer Profiles</Text>
                  <Text style={styles.reassuranceText}>Select common customer groups likely to purchase from your business:</Text>
                  
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
                </View>

                {/* SECTION 3: ADD CUSTOM TARGET MARKET (USER SOVEREIGNTY) */}
                <View style={styles.customCustomerBox}>
                  <Text style={styles.questionLabel}>Add Custom Target Group</Text>
                  <Text style={styles.reassuranceText}>You can still define your own specific target customer group:</Text>
                  <View style={styles.customCustomerInputRow}>
                    <TextInput
                      style={styles.customCustomerInput}
                      placeholder="e.g. BPO graveyard shift workers, gym members..."
                      placeholderTextColor={LikhoraColors.textPlaceholder}
                      value={customCustomerText}
                      onChangeText={setCustomCustomerText}
                    />
                    <TouchableOpacity
                      style={[styles.customCustomerAddBtn, !customCustomerText.trim() && styles.customCustomerAddBtnDisabled]}
                      onPress={handleAddCustomCustomer}
                      disabled={!customCustomerText.trim()}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.customCustomerAddBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
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
                <Text style={styles.reassuranceText}>
                  Capital (Puhunan) is the total money you have ready to spend on equipment, inventory, permits, and your initial cash buffer.
                </Text>

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

                {/* Live Generated Contingency Plan Deck (Fixed Height, Horizontal Carousel) */}
                {selectedRisks.length > 0 && (
                  <View style={styles.contingencyCard}>
                    <View style={styles.contingencyHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <ShieldCheck size={18} color="#42143E" style={{ marginRight: 6, flexShrink: 0 }} />
                        <Text style={styles.contingencyTitle} numberOfLines={1}>Your contingency plan so far</Text>
                      </View>
                      <View style={styles.contingencyCountBadge}>
                        <Text style={styles.contingencyCountBadgeText}>
                          {selectedRisks.length} Action{selectedRisks.length === 1 ? '' : 's'} Ready
                        </Text>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={282}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      contentContainerStyle={styles.contingencyHorizontalList}
                      onScroll={(e) => {
                        const offsetX = e.nativeEvent.contentOffset.x;
                        const idx = Math.round(offsetX / 282);
                        setActiveContingencyIndex(Math.max(0, Math.min(idx, selectedRisks.length - 1)));
                      }}
                      scrollEventThrottle={16}
                    >
                      {selectedRisks.map((risk, idx) => (
                        <View key={risk} style={styles.contingencyHorizontalItem}>
                          <View style={styles.contingencyItemTop}>
                            <View style={styles.contingencyRiskBadge}>
                              <ShieldAlert size={12} color="#92400E" style={{ marginRight: 4, flexShrink: 0 }} />
                              <Text style={styles.contingencyRiskText} numberOfLines={1}>
                                Risk: {risk}
                              </Text>
                            </View>
                            <Text style={styles.contingencyIndexText}>
                              {idx + 1}/{selectedRisks.length}
                            </Text>
                          </View>
                          <Text style={styles.contingencyActionText} numberOfLines={3}>
                            <Text style={styles.contingencyActionPrefix}>Action: </Text>
                            {riskContingencies[risk]}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>

                    {selectedRisks.length > 1 && (
                      <View style={styles.contingencyPaginationRow}>
                        <View style={styles.contingencyDots}>
                          {selectedRisks.map((_, dotIdx) => (
                            <View
                              key={dotIdx}
                              style={[
                                styles.contingencyDot,
                                activeContingencyIndex === dotIdx && styles.contingencyDotActive,
                              ]}
                            />
                          ))}
                        </View>
                        <View style={styles.contingencySwipeHint}>
                          <MoveHorizontal size={12} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.contingencySwipeHintText}>
                            Swipe to view all {selectedRisks.length}
                          </Text>
                        </View>
                      </View>
                    )}
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
              const validationErr = getStepValidationError();
              if (validationErr) {
                showToast(validationErr);
                return;
              }
              if (step < 7) {
                // Start Khora's custom-profile build now, so the tailored
                // questions on step 4 are usually ready before the user is.
                if (step === 1) ensureCustomProfile();
                animateToStep(step + 1);
              } else {
                handleFinishOnboarding();
              }
            }}
            disabled={loading}
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

      {/* Under-18 Minor Acceptability Confirmation Modal */}
      <Modal
        visible={minorModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setMinorModalVisible(false);
          setPendingMinorSegment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.minorModalHeader}>
              <View style={styles.minorWarningIconCircle}>
                <ShieldAlert size={26} color="#D97706" />
              </View>
              <Text style={styles.minorModalTitle}>Age 1–18 Consumer Acceptability Notice</Text>
            </View>

            <Text style={styles.minorModalBody}>
              Khora AI identified potential consumers in the <Text style={{ fontWeight: '700', color: LikhoraColors.textPrimary }}>1–18 (Students & Youth)</Text> demographic near your location.
            </Text>

            <View style={styles.minorLawBox}>
              <Info size={14} color="#D97706" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.minorModalNotice}>
                Under Philippine consumer protection laws (RA 7394) and ethical business standards, commercial offerings targeting minors must be age-appropriate, safe, and respectful of parental guidance.
              </Text>
            </View>

            <Text style={styles.minorModalQuestion}>
              As the business owner, do you accept and confirm including Minors (Ages 1–18) as a target consumer group for your business?
            </Text>

            <View style={styles.minorModalActions}>
              <TouchableOpacity
                style={styles.minorCancelBtn}
                onPress={() => {
                  setMinorModalVisible(false);
                  setPendingMinorSegment(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.minorCancelText}>Cancel / Exclude</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.minorConfirmBtn}
                onPress={handleConfirmMinorAcceptance}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.minorConfirmText}>Accept & Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: Spacing.four,
    shadowColor: '#42143E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contingencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  contingencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyCountBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  contingencyCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyHorizontalList: {
    paddingVertical: 2,
    gap: 12,
    paddingRight: 8,
  },
  contingencyHorizontalItem: {
    width: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 92,
  },
  contingencyItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  contingencyRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
    maxWidth: '78%',
  },
  contingencyRiskText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyActionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  contingencyActionPrefix: {
    fontWeight: '700',
    color: '#1E293B',
  },
  contingencyPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 2,
  },
  contingencyDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contingencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  contingencyDotActive: {
    width: 16,
    backgroundColor: '#42143E',
  },
  contingencySwipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contingencySwipeHintText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    fontFamily: LikhoraFont.fontFamily,
  },
  validationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  validationNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
    fontWeight: '600',
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
  floatingToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 54,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1320',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: Radius.large,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 520,
  },
  floatingToastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 18,
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

  // Market Viability & Reviews Enhancements
  // Market Intelligence Deck & Radar Scanner
  aiRadarScanningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  radarPulseBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radarScanningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  radarScanningSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckHeader: {
    marginBottom: 12,
  },
  deckHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  deckLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    maxWidth: '100%',
    flexShrink: 1,
  },
  deckLocationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
    flexShrink: 1,
  },
  deckSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
  },
  deckVerdictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  deckVerdictOpportunity: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  deckVerdictCrowded: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  deckVerdictBalanced: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  deckVerdictPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckVerdictTextOpportunity: {
    color: '#166534',
  },
  deckVerdictTextCrowded: {
    color: '#92400E',
  },
  deckVerdictTextBalanced: {
    color: '#475569',
  },
  deckStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.medium,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  deckStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  deckTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.large,
    padding: 3,
    marginBottom: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: Radius.medium,
    backgroundColor: 'transparent',
  },
  deckTabBtnActive: {
    backgroundColor: '#42143E',
    shadowColor: '#42143E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  deckTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deckTabBody: {
    marginTop: 2,
  },
  competitorsHorizontalList: {
    paddingVertical: 2,
    gap: 10,
  },
  competitorCardHorizontal: {
    width: 275,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  compHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  compAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  compRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  compRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: LikhoraFont.fontFamily,
  },
  compReviewBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.small,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#42143E',
    marginTop: 6,
  },
  compReviewQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#0F172A',
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  compReviewAuthor: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  compNoReviewBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.small,
    padding: 8,
    marginTop: 6,
  },
  compNoReviewText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
    fontFamily: LikhoraFont.fontFamily,
  },
  carouselSwipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  carouselSwipeHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    fontFamily: LikhoraFont.fontFamily,
  },
  zeroCompetitorsBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.large,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  zeroCompetitorsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  zeroCompetitorsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  zeroCompetitorsDesc: {
    fontSize: 11,
    color: '#14532D',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckInsightCardOpportunity: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.medium,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  deckInsightCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deckInsightCardTitleOpportunity: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckInsightCardTextOpportunity: {
    fontSize: 11,
    color: '#14532D',
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckInsightCardState: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.medium,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  deckInsightCardTitleState: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckInsightCardTextState: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckRecommendationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.medium,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckRecTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckRecText: {
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoSummary: {
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 17,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoList: {
    gap: 6,
  },
  deckDemoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.medium,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckDemoItemMinor: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  deckDemoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deckDemoItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoItemBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  deckDemoAgeBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckDemoAgeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoShareBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deckDemoShareBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoItemNote: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  deckDemoMinorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.small,
  },
  deckDemoMinorNoticeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentChipMinor: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  segmentChipShare: {
    fontSize: 10,
    color: '#0369A1',
    fontWeight: '700',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },

  // Demographic Segmentation in Step 4
  sectionHeaderWrap: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  demographicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    padding: 14,
    marginBottom: 10,
  },
  demographicCardSelected: {
    borderColor: LikhoraColors.primary,
    backgroundColor: '#FAF5FF',
  },
  demographicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demographicLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  demographicAgeBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  demographicAgeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorAgeBadge: {
    backgroundColor: '#FEF3C7',
  },
  minorAgeBadgeText: {
    color: '#B45309',
  },
  demographicShareBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  demographicShareBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    fontFamily: LikhoraFont.fontFamily,
  },
  demographicNote: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  demographicMinorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: Radius.medium,
    padding: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  demographicMinorNoticeConfirmed: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  demographicMinorNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  demographicMinorNoticeTextConfirmed: {
    color: '#047857',
  },

  // Custom Customer Input
  customCustomerBox: {
    marginBottom: 20,
  },
  customCustomerInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  customCustomerInput: {
    flex: 1,
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 14,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  customCustomerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.large,
    paddingHorizontal: 16,
  },
  customCustomerAddBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  customCustomerAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: LikhoraFont.fontFamily,
  },

  // Under-18 Minor Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  minorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  minorWarningIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  minorModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorModalBody: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorLawBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: Radius.large,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  minorModalNotice: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorModalQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  minorCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.xlarge,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minorCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  minorConfirmBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: Radius.xlarge,
    backgroundColor: LikhoraColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minorConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
});
