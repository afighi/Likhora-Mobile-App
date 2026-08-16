import React, { useState, useRef, useEffect } from 'react';
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
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Utensils, 
  Coffee, 
  Store, 
  Globe, 
  Wrench, 
  ShoppingBag, 
  Truck, 
  PlusCircle, 
  MapPin, 
  Info, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { syncUserProfile, saveUserRoadmap, saveOnboardingStepProgress, getDefaultPhilippineRoadmapTasks, RoadmapTask } from '@/services/supabase';
import { 
  PHILIPPINE_REGIONS, 
  getProvincesByRegionAsync, 
  getCitiesByProvinceAsync, 
  getBarangaysByCityAsync, 
  detectCurrentDeviceLocation, 
  generateAILocationCheck, 
  LocationItem, 
  AILocationAnalysis 
} from '@/services/location';
import { SearchableDropdownModal } from '@/components/ui/SearchableDropdownModal';

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
  const [aiLocationCheck, setAiLocationCheck] = useState<AILocationAnalysis | null>(null);

  // STEP 4 State: Market & Product
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [differentiator, setDifferentiator] = useState('');
  const [researchStage, setResearchStage] = useState('');

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
        } catch (e) {
          console.warn('Error parsing saved onboarding draft:', e);
        }
      }
    }
  }, [userProfile]);

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
      setAiLocationCheck(generateAILocationCheck(bType || 'Business', selectedCity.name));
    } else {
      setBarangaysList([]);
    }
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
      setAiLocationCheck(generateAILocationCheck(bType || 'Business', result.city.name));
    }
  };

  // Risk Contingencies Database
  const RISK_CONTINGENCIES: { [risk: string]: string } = {
    'Slow sales': 'Launch a 3-day opening promotion and partner with neighboring stores for cross-referrals.',
    'Strong competition': 'Highlight your specific business advantage and offer GCash cash-in convenience or bundle items.',
    'Rising supply prices': 'Source ingredients directly from Divisoria or local wet market wholesalers and lock in bulk rates.',
    'Spoilage': 'Keep daily inventory lean during week 1 and establish a strict first-in, first-out stock system.',
    'Running out of cash': 'Keep a portion of your starting budget untouched as emergency cash and review weekly expenses.',
    'Typhoons or outages': 'Prepare solar/rechargeable lights and waterproof storage for raw inventory.',
    'Permit problems': 'Complete your Barangay Micro-Business Permit first before applying for Mayor permit clearance.',
    'Not having enough time': 'Set fixed 2-hour daily operational slots and delegate basic tasks to family or staff.',
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
      const locationString = selectedCity ? `${selectedCity.name}, ${selectedProvince?.name || 'Philippines'}` : 'Philippines';

      // 1. Sync User Profile in Supabase
      if (user) {
        await syncUserProfile({
          id: user.uid,
          email: userProfile?.email || user.email || '',
          full_name: userProfile?.full_name || 'Entrepreneur',
          business_name: businessNameInput.trim() || `${finalCategory} Venture`,
          business_type: finalCategory,
          budget: startingBudget,
          location: locationString,
          onboarded: true,
          onboarding_step: 8,
        });

        // 2. Save User Roadmap Tasks in Supabase
        const roadmapTasks: RoadmapTask[] = getDefaultPhilippineRoadmapTasks(user.uid, finalCategory, locationString);
        await saveUserRoadmap(roadmapTasks);
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
      console.warn('Onboarding save note:', e);
      setOnboardingCompleted(true);
      router.replace('/suppliers');
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
  const CATEGORY_OPTIONS = [
    { id: 'Carinderia', label: 'Carinderia', icon: Utensils, desc: 'Eateries, food stalls & snacks' },
    { id: 'Food Stall', label: 'Food Stall', icon: Coffee, desc: 'Kiosks, food carts & drinks' },
    { id: 'Sari-sari Store', label: 'Sari-sari Store', icon: Store, desc: 'Neighborhood retail & groceries' },
    { id: 'Online Shop', label: 'Online Shop', icon: Globe, desc: 'E-commerce & digital products' },
    { id: 'Services', label: 'Services', icon: Wrench, desc: 'Laundry, repair, salon & print' },
    { id: 'Clothing & RTW', label: 'Clothing & RTW', icon: ShoppingBag, desc: 'Apparel, accessories & tailoring' },
    { id: 'Delivery / Rides', label: 'Delivery / Rides', icon: Truck, desc: 'Transport, logistics & courier' },
    { id: 'other', label: 'Something else', icon: PlusCircle, desc: 'Specify custom business' },
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
              else router.back();
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

                {/* AI Location Check Card */}
                {aiLocationCheck && (
                  <View style={styles.aiLocationCard}>
                    <View style={styles.aiLocHeader}>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>{aiLocationCheck.overallScore}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verdictText}>Verdict: {aiLocationCheck.verdict}</Text>
                        <Text style={styles.metaLocText}>
                          Foot Traffic: {aiLocationCheck.footTraffic} • Competition: {aiLocationCheck.competition}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.aiLocRecText}>{aiLocationCheck.recommendation}</Text>
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
                <Text style={styles.eyebrow}>MARKET & PRODUCT</Text>
                <Text style={styles.stepTitle}>Who will buy from you?</Text>

                <View style={styles.optionsList}>
                  {['Students', 'Office Workers', 'Local Residents', 'Commuters', 'Online Shoppers'].map((group) => {
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
                  <Text style={styles.questionLabel}>What makes your business different?</Text>
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="e.g. Cheaper price, special secret sauce, 24/7 delivery..."
                    placeholderTextColor={LikhoraColors.textPlaceholder}
                    value={differentiator}
                    onChangeText={setDifferentiator}
                    multiline
                  />
                </View>

                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>How far have you gone with your market research?</Text>
                  <View style={styles.optionsList}>
                    {[
                      { id: 'not_yet', label: 'Not yet' },
                      { id: 'asked', label: 'Asked around friends/neighbors' },
                      { id: 'checked', label: 'Checked nearby competitors' },
                      { id: 'sold', label: 'Already sold test products' },
                    ].map((item) => {
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
                    {['DTI', 'Barangay clearance', "Mayor's / Business Permit", 'BIR', 'Sanitary Permit', 'Fire Safety requirements'].map((p) => {
                      const isSelected = obtainedPermits.includes(p);
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                          onPress={() => setObtainedPermits(toggleArrayItem(obtainedPermits, p))}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {p}
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
                  {Object.keys(RISK_CONTINGENCIES).map((risk) => {
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
                          Action: {RISK_CONTINGENCIES[risk]}
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
