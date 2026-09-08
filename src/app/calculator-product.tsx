import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  X,
  Check,
  Minus,
  Plus,
  Sparkles,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  Product,
  UserTemplate,
  fetchProductById,
  fetchUserTemplates,
  fetchUserProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from '@/services/supabase';
import {
  PurchaseMode,
  computeCost,
  computeAtPrice,
  priceStep,
  EXTRA_COST_EXAMPLES,
  resolveCategory,
} from '@/services/calculator';
import { PriceSuggestion, suggestPrice } from '@/services/pricingAdvisor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { notify } from '@/utils/dialog';

const peso = (n: number) =>
  `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseNum = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const PURCHASE_MODES: { id: PurchaseMode; label: string; caption: string }[] = [
  { id: 'piece', label: 'Per piece', caption: 'Bought one by one' },
  { id: 'pack', label: 'Pack', caption: 'Sack, bundle or pack' },
  { id: 'case', label: 'Case', caption: 'Whole case or crate' },
  { id: 'kilo', label: 'Kilo', caption: 'Weighed, then portioned' },
  { id: 'liter', label: 'Liter', caption: 'Measured, then portioned' },
];

type PortionUnit = 'kg' | 'g' | 'L' | 'ml';

// Portions are entered in whichever unit reads naturally, but every
// calculation and the stored value use the base unit the purchase was made in.
const toBaseUnit = (value: number, unit: PortionUnit): number =>
  unit === 'g' || unit === 'ml' ? value / 1000 : value;

const fromBaseUnit = (value: number, unit: PortionUnit): number =>
  unit === 'g' || unit === 'ml' ? Math.round(value * 1000) : value;

const STEP_LABELS = ['Product', 'Cost', 'Price'];

// Fingerprint of everything Khora's answer depends on, so a saved product can
// be recognised as "still priced for these exact numbers" without re-asking.
const buildSignature = (
  productName: string,
  mode: PurchaseMode,
  totalCostPerPiece: number,
  batchPieces: number,
  dailyUnits: number
) => `${productName.trim().toLowerCase()}|${mode}|${totalCostPerPiece}|${batchPieces}|${dailyUnits}`;

export default function CalculatorProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { user, userProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // ---- Step 1: what is it, and which business roadmap it belongs to ----
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  // Categories this user already has, so a new product joins one rather than
  // spawning a near-duplicate chip in the filter bar.
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [businessKey, setBusinessKey] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageExt, setImageExt] = useState<'jpg' | 'png'>('jpg');

  // ---- Step 2: what it cost ----
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('piece');
  const [manualCostPerPiece, setManualCostPerPiece] = useState('');
  const [batchPieces, setBatchPieces] = useState('');
  const [packTotalPrice, setPackTotalPrice] = useState('');
  const [packItemCount, setPackItemCount] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkTotalPrice, setBulkTotalPrice] = useState('');
  const [bulkPortionSize, setBulkPortionSize] = useState('');
  // Someone selling 250-gram packs thinks in grams, not 0.25 kilos. The unit
  // is a display choice; the math below always works in the base unit.
  const [portionUnit, setPortionUnit] = useState<PortionUnit>('kg');
  const [dagdagGastosPerPiece, setDagdagGastosPerPiece] = useState('');
  const [estimatedDailyUnitsSold, setEstimatedDailyUnitsSold] = useState('');

  // ---- Step 3: Khora's price ----
  const [thinking, setThinking] = useState(false);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [suggestionFor, setSuggestionFor] = useState(''); // input signature the suggestion was made for
  const [price, setPrice] = useState(0);
  const [priceSource, setPriceSource] = useState<'ai' | 'manual'>('ai');
  const [showMath, setShowMath] = useState(false);

  // Every product is filed under one business roadmap: the user's live
  // roadmap, or any roadmap saved in their template library. Someone running
  // two ventures gets a separate price book for each.
  const businessOptions = useMemo(
    () => [
      {
        key: 'active',
        // Show the user's actual business, not a generic label — falling back
        // through the fields most likely to be filled in.
        label: userProfile?.business_name || userProfile?.business_type || 'My current roadmap',
        meta: userProfile?.business_type
          ? `${userProfile.business_type} · Active roadmap`
          : 'Active roadmap',
      },
      ...templates.map((template) => ({
        key: template.id,
        label: template.name,
        meta: template.business_type ? `${template.business_type} · Saved template` : 'Saved template',
      })),
    ],
    [templates, userProfile?.business_name, userProfile?.business_type]
  );

  // With only one roadmap to choose from there is nothing to decide, so it
  // selects itself. Derived rather than stored, so no effect has to write it.
  const selectedBusiness =
    businessOptions.find((option) => option.key === businessKey) ||
    (businessOptions.length === 1 ? businessOptions[0] : null);

  const cost = useMemo(
    () =>
      computeCost({
        purchaseMode,
        manualCostPerPiece: parseNum(manualCostPerPiece),
        batchPieces: parseNum(batchPieces),
        packTotalPrice: parseNum(packTotalPrice),
        packItemCount: parseNum(packItemCount),
        bulkQuantity: parseNum(bulkQuantity),
        bulkTotalPrice: parseNum(bulkTotalPrice),
        bulkPortionSize: toBaseUnit(parseNum(bulkPortionSize), portionUnit),
        dagdagGastosPerPiece: parseNum(dagdagGastosPerPiece),
      }),
    [
      purchaseMode,
      manualCostPerPiece,
      batchPieces,
      packTotalPrice,
      packItemCount,
      bulkQuantity,
      bulkTotalPrice,
      bulkPortionSize,
      portionUnit,
      dagdagGastosPerPiece,
    ]
  );

  const outcome = useMemo(
    () => computeAtPrice(cost, price, parseNum(estimatedDailyUnitsSold)),
    [cost, price, estimatedDailyUnitsSold]
  );

  // What this product will actually be filed under: one of the user's existing
  // categories when Khora's suggestion matches one, otherwise a new category
  // created from the suggestion.
  const resolvedCategory = suggestion ? resolveCategory(suggestion.category, existingCategories) : '';
  const isNewCategory = Boolean(resolvedCategory) && !existingCategories.includes(resolvedCategory);

  // Anything that would change Khora's answer. When this differs from the
  // signature the current suggestion was made for, the advice is stale and
  // step 3 asks again instead of showing a price for the old numbers.
  // Editing shows everything on one page: the wizard exists to keep a FIRST
  // pass from feeling like a wall of fields, but someone editing already knows
  // their product and usually wants to change one number and leave.
  const showSection = (section: 1 | 2 | 3) => isEditing || step === section;

  const baseUnitLabel = purchaseMode === 'liter' ? 'liters' : 'kilos';
  const unitOptions: { id: PortionUnit; label: string }[] =
    purchaseMode === 'liter'
      ? [
          { id: 'L', label: 'Liters' },
          { id: 'ml', label: 'Milliliters' },
        ]
      : [
          { id: 'kg', label: 'Kilos' },
          { id: 'g', label: 'Grams' },
        ];

  const inputSignature = buildSignature(
    name,
    purchaseMode,
    cost.totalCostPerPiece,
    cost.batchPieces,
    parseNum(estimatedDailyUnitsSold)
  );

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;

      const [templateResult, categoryResult, productResult] = await Promise.all([
        fetchUserTemplates(user.uid),
        fetchUserProductCategories(user.uid),
        id ? fetchProductById(id, user.uid) : Promise.resolve({ data: null, error: null }),
      ]);

      setTemplates(templateResult.data || []);
      setExistingCategories(categoryResult.data || []);

      const existing = productResult.data as Product | null;
      if (existing) {
        setName(existing.name);
        setBusinessKey(existing.business_key || null);
        setImageUri(existing.image_url || null);
        setPurchaseMode(existing.purchase_mode);
        setManualCostPerPiece(existing.manual_cost_per_piece != null ? String(existing.manual_cost_per_piece) : '');
        setBatchPieces(existing.batch_pieces != null ? String(existing.batch_pieces) : '');
        setPackTotalPrice(existing.pack_total_price != null ? String(existing.pack_total_price) : '');
        setPackItemCount(existing.pack_item_count != null ? String(existing.pack_item_count) : '');
        setBulkQuantity(existing.bulk_quantity != null ? String(existing.bulk_quantity) : '');
        setBulkTotalPrice(existing.bulk_total_price != null ? String(existing.bulk_total_price) : '');
        const savedUnit = (existing.bulk_portion_unit as PortionUnit) || 'kg';
        setPortionUnit(savedUnit);
        setBulkPortionSize(
          existing.bulk_portion_size != null
            ? String(fromBaseUnit(existing.bulk_portion_size, savedUnit))
            : ''
        );
        setDagdagGastosPerPiece(existing.dagdag_gastos_per_piece ? String(existing.dagdag_gastos_per_piece) : '');
        setEstimatedDailyUnitsSold(
          existing.estimated_daily_units_sold != null ? String(existing.estimated_daily_units_sold) : ''
        );
        setPrice(existing.selling_price || 0);
        setPriceSource(existing.price_source === 'manual' ? 'manual' : 'ai');

        // Rebuild the saved advice so reopening a product doesn't spend an
        // AI call just to redisplay a price that was already decided.
        if (existing.ai_reasoning) {
          setSuggestion({
            category: existing.category || 'General',
            sellingPrice: existing.ai_suggested_price || existing.selling_price,
            markupPercent: existing.ai_suggested_markup_percent || 0,
            reasoning: existing.ai_reasoning,
            tips: existing.ai_tips || [],
            confidence: (existing.ai_confidence as PriceSuggestion['confidence']) || 'estimate',
            source: existing.ai_source === 'khora-ai' ? 'khora-ai' : 'offline',
          });

          // Mark that advice as current for the numbers it was saved with, so
          // an untouched product opens straight onto its saved price instead
          // of spending another AI call on the same inputs.
          const savedCost = computeCost({
            purchaseMode: existing.purchase_mode,
            manualCostPerPiece: existing.manual_cost_per_piece || 0,
            batchPieces: existing.batch_pieces || 0,
            packTotalPrice: existing.pack_total_price || 0,
            packItemCount: existing.pack_item_count || 0,
            bulkTotalPrice: existing.bulk_total_price || 0,
            bulkPortionSize: existing.bulk_portion_size || 0,
            dagdagGastosPerPiece: existing.dagdag_gastos_per_piece || 0,
          });
          setSuggestionFor(
            buildSignature(
              existing.name,
              existing.purchase_mode,
              savedCost.totalCostPerPiece,
              savedCost.batchPieces,
              existing.estimated_daily_units_sold || 0
            )
          );
        }
      }

      setLoadingExisting(false);
    };

    load();
  }, [id, user?.uid]);

  const askKhora = useCallback(async () => {
    setThinking(true);
    try {
      const result = await suggestPrice({
        productName: name.trim(),
        cost,
        purchaseMode,
        businessType: userProfile?.business_type,
        location: userProfile?.location,
        estimatedDailyUnitsSold: parseNum(estimatedDailyUnitsSold) || null,
        businessLabel: selectedBusiness?.label,
      });
      setSuggestion(result);
      setSuggestionFor(inputSignature);
      setPrice(result.sellingPrice);
      setPriceSource('ai');
    } finally {
      setThinking(false);
    }
  }, [
    name,
    cost,
    purchaseMode,
    userProfile,
    estimatedDailyUnitsSold,
    selectedBusiness?.label,
    inputSignature,
  ]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Permission needed', 'Allow photo library access to add a product photo.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
      setImageExt(asset.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg');
    }
  };

  const validateStep1 = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'What is this product called?';
    if (!selectedBusiness) errs.business = 'Choose which business this belongs to';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (purchaseMode === 'piece') {
      if (parseNum(manualCostPerPiece) <= 0) errs.manualCostPerPiece = 'Enter the cost per piece';
    } else if (purchaseMode === 'pack' || purchaseMode === 'case') {
      if (parseNum(packTotalPrice) <= 0) errs.packTotalPrice = 'Enter the total you paid';
      if (parseNum(packItemCount) <= 0) errs.packItemCount = 'How many items inside?';
    } else {
      const quantity = parseNum(bulkQuantity);
      const portion = toBaseUnit(parseNum(bulkPortionSize), portionUnit);
      const unit = purchaseMode === 'kilo' ? 'kilos' : 'liters';

      if (quantity <= 0) errs.bulkQuantity = `Enter how many ${unit} you bought`;
      if (parseNum(bulkTotalPrice) <= 0) errs.bulkTotalPrice = 'Enter the total you paid';
      if (portion <= 0) {
        errs.bulkPortionSize = 'Enter how much you want to sell at a time';
      } else if (quantity > 0 && portion > quantity) {
        // Otherwise the derived count silently floors to zero and every figure
        // downstream reads as ₱0.00 with nothing explaining why.
        errs.bulkPortionSize = `One pack cannot be bigger than the ${quantity} ${unit} you bought`;
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      if (suggestionFor !== inputSignature) askKhora();
    }
  };

  const goBack = () => {
    if (step > 1) {
      setFieldErrors({});
      setStep(step - 1);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/calculator');
    }
  };

  const adjustPrice = (direction: 1 | -1) => {
    const delta = priceStep(price) * direction;
    const next = Math.max(0, Math.round((price + delta) * 100) / 100);
    setPrice(next);
    setPriceSource(next === suggestion?.sellingPrice ? 'ai' : 'manual');
  };

  const resetToSuggestion = () => {
    if (!suggestion) return;
    setPrice(suggestion.sellingPrice);
    setPriceSource('ai');
  };

  const confirmDelete = async () => {
    if (!user?.uid || !id) return;

    setDeleting(true);
    try {
      const { error } = await deleteProduct(id, user.uid);
      if (error) {
        console.warn('Delete product failed:', error);
        notify('Could not delete product', 'Please check your connection and try again.');
        return;
      }
      setConfirmingDelete(false);
      // Back to the list, which refetches on focus and so drops this row.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/calculator');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !suggestion) return;
    // Creating validates on the way through each step; editing shows every
    // field at once, so the checks have to run here instead.
    if (isEditing && (!validateStep1() || !validateStep2())) return;

    setSaving(true);
    try {
      let finalImageUrl: string | null = imageUri;

      // Only re-upload when a brand-new local photo was picked this
      // session — an unchanged existing image_url just passes through.
      if (imageBase64) {
        setUploadingImage(true);
        const { url, error: uploadError } = await uploadProductImage(user.uid, imageBase64, imageExt);
        setUploadingImage(false);
        if (uploadError) {
          notify(
            'Photo upload failed',
            'The rest of your product will still save — you can try adding the photo again after.'
          );
        } else {
          finalImageUrl = url;
        }
      }

      const payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.uid,
        name: name.trim(),
        category: resolvedCategory,
        image_url: finalImageUrl,

        business_key: selectedBusiness?.key || 'active',
        business_label: selectedBusiness?.label || null,

        purchase_mode: purchaseMode,
        manual_cost_per_piece: purchaseMode === 'piece' ? parseNum(manualCostPerPiece) : null,
        batch_pieces: purchaseMode === 'piece' ? parseNum(batchPieces) : null,
        pack_total_price: purchaseMode === 'pack' || purchaseMode === 'case' ? parseNum(packTotalPrice) : null,
        pack_item_count: purchaseMode === 'pack' || purchaseMode === 'case' ? parseNum(packItemCount) : null,
        bulk_quantity: purchaseMode === 'kilo' || purchaseMode === 'liter' ? parseNum(bulkQuantity) : null,
        bulk_total_price: purchaseMode === 'kilo' || purchaseMode === 'liter' ? parseNum(bulkTotalPrice) : null,
        bulk_portion_size:
          purchaseMode === 'kilo' || purchaseMode === 'liter'
            ? toBaseUnit(parseNum(bulkPortionSize), portionUnit)
            : null,
        bulk_portion_unit:
          purchaseMode === 'kilo' || purchaseMode === 'liter' ? portionUnit : null,
        // Stored as the derived count, not something the user typed.
        bulk_pieces_yielded:
          purchaseMode === 'kilo' || purchaseMode === 'liter' ? cost.batchPieces : null,

        dagdag_gastos_per_piece: cost.dagdagGastosPerPiece,
        estimated_daily_units_sold: estimatedDailyUnitsSold ? parseNum(estimatedDailyUnitsSold) : null,

        // Markup is no longer entered — it's whatever the final price works
        // out to over total cost.
        markup_type: 'percent',
        markup_value: outcome.markupPercentEffective,

        ai_suggested_price: suggestion.sellingPrice,
        ai_suggested_markup_percent: suggestion.markupPercent,
        ai_reasoning: suggestion.reasoning,
        ai_confidence: suggestion.confidence,
        ai_tips: suggestion.tips,
        ai_source: suggestion.source,
        price_source: priceSource,

        puhunan: cost.puhunan,
        total_cost_per_piece: cost.totalCostPerPiece,
        exact_selling_price: price,
        selling_price: outcome.sellingPrice,
        tubo_per_piece: outcome.tuboPerPiece,
        margin_percent: outcome.marginPercent,
        markup_percent_effective: outcome.markupPercentEffective,
        batch_total_investment: cost.batchTotalInvestment,
        batch_total_profit_potential: outcome.batchTotalProfitPotential,
        breakeven_units: outcome.breakevenUnits,
        breakeven_days: outcome.breakevenDays,
        remaining_pieces_as_profit: outcome.remainingPiecesAsProfit,
      };

      const { error } = isEditing && id
        ? await updateProduct(id, user.uid, payload)
        : await createProduct(payload);

      if (error) {
        console.warn('Save product failed:', error);
        notify('Could not save', 'Please check your connection and try again.');
        return;
      }

      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={LikhoraColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const sellingBelowCost = price > 0 && price <= cost.totalCostPerPiece;

  // On the single-page edit form there is no "next step" to trigger a fresh
  // suggestion, so a changed cost would otherwise sit under a price worked out
  // for the old numbers. Say so, and let the user decide when to re-ask —
  // re-pricing on every keystroke would burn API calls and silently overwrite
  // a price they may have set by hand.
  const priceIsStale = isEditing && Boolean(suggestion) && suggestionFor !== inputSignature;


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isEditing ? 'Edit Product' : 'New Product'}</Text>
        {/* Delete lives here only when editing — there is nothing to delete
            while a product is still being created. */}
        {isEditing ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setConfirmingDelete(true)}
            disabled={deleting || saving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Delete this product"
          >
            {deleting ? (
              <ActivityIndicator size="small" color={LikhoraColors.errorRed} />
            ) : (
              <Trash2 size={18} color={LikhoraColors.errorRed} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {/* One question at a time — but only when creating. There are no steps to
          track when the whole form is already on screen. */}
      {!isEditing && (
      <View style={styles.progressRow}>
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const done = step > stepNumber;
          const active = step === stepNumber;
          return (
            <View key={label} style={styles.progressItem}>
              <View style={[styles.progressBar, (done || active) && styles.progressBarActive]} />
              <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ------------------------------ STEP 1 ------------------------------ */}
          {showSection(1) && (
            <View>
              <Text style={styles.question}>What are you pricing?</Text>
              <Text style={styles.questionSub}>Just the name for now — Khora works out the category.</Text>

              <Input
                placeholder="e.g. Coke Mismo 250ml"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                error={fieldErrors.name}
                autoCapitalize="words"
              />

              <Text style={styles.sectionLabel}>Which business does this belong to?</Text>
              {fieldErrors.business ? <Text style={styles.errorText}>{fieldErrors.business}</Text> : null}

              {businessOptions.map((option) => {
                const selected = selectedBusiness?.key === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.stepOption, selected && styles.stepOptionSelected]}
                    onPress={() => {
                      setBusinessKey(option.key);
                      if (fieldErrors.business) setFieldErrors({ ...fieldErrors, business: '' });
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.stepOptionTitle, selected && styles.stepOptionTitleSelected]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.stepOptionMeta}>{option.meta}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <Check size={12} color="#FFFFFF" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {templates.length === 0 ? (
                <Text style={styles.pickerHint}>
                  Save a roadmap to your template library to keep a separate price book for each
                  business.
                </Text>
              ) : null}

              <TouchableOpacity style={styles.photoRow} onPress={handlePickImage} activeOpacity={0.8}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.photoThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.photoThumb, styles.photoThumbEmpty]}>
                    <Camera size={18} color={LikhoraColors.textPlaceholder} />
                  </View>
                )}
                <Text style={styles.photoText}>{imageUri ? 'Change photo' : 'Add a photo (optional)'}</Text>
                {imageUri ? (
                  <TouchableOpacity
                    onPress={() => {
                      setImageUri(null);
                      setImageBase64(null);
                    }}
                    hitSlop={10}
                  >
                    <X size={16} color={LikhoraColors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            </View>
          )}

          {/* ------------------------------ STEP 2 ------------------------------ */}
          {showSection(2) && (
            <View style={isEditing ? styles.stackedSection : undefined}>
              <Text style={styles.question}>How did you buy it?</Text>
              <Text style={styles.questionSub}>This is all we need — the price and the count.</Text>

              <View style={styles.modeGrid}>
                {PURCHASE_MODES.map((mode) => {
                  const selected = purchaseMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[styles.modeCard, selected && styles.modeCardSelected]}
                      onPress={() => setPurchaseMode(mode.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>{mode.label}</Text>
                      <Text style={[styles.modeCaption, selected && styles.modeCaptionSelected]} numberOfLines={1}>
                        {mode.caption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {purchaseMode === 'piece' && (
                <View>
                  <Input
                    label="How much is one piece?"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={manualCostPerPiece}
                    onChangeText={(t) => {
                      setManualCostPerPiece(t);
                      if (fieldErrors.manualCostPerPiece) setFieldErrors({ ...fieldErrors, manualCostPerPiece: '' });
                    }}
                    error={fieldErrors.manualCostPerPiece}
                  />
                  <Input
                    label="How many did you buy?"
                    placeholder="e.g. 20"
                    keyboardType="number-pad"
                    value={batchPieces}
                    onChangeText={setBatchPieces}
                    hint="Used to work out when you earn your capital back."
                  />
                </View>
              )}

              {(purchaseMode === 'pack' || purchaseMode === 'case') && (
                <View>
                  <Input
                    label={`How much for the whole ${purchaseMode === 'pack' ? 'pack' : 'case'}?`}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={packTotalPrice}
                    onChangeText={(t) => {
                      setPackTotalPrice(t);
                      if (fieldErrors.packTotalPrice) setFieldErrors({ ...fieldErrors, packTotalPrice: '' });
                    }}
                    error={fieldErrors.packTotalPrice}
                  />
                  <Input
                    label="How many items inside?"
                    placeholder="e.g. 24"
                    keyboardType="number-pad"
                    value={packItemCount}
                    onChangeText={(t) => {
                      setPackItemCount(t);
                      if (fieldErrors.packItemCount) setFieldErrors({ ...fieldErrors, packItemCount: '' });
                    }}
                    error={fieldErrors.packItemCount}
                  />
                </View>
              )}

              {(purchaseMode === 'kilo' || purchaseMode === 'liter') && (
                <View>
                  <Input
                    label={`How many ${purchaseMode === 'kilo' ? 'kilos' : 'liters'} did you buy?`}
                    placeholder={purchaseMode === 'kilo' ? 'e.g. 100' : 'e.g. 20'}
                    keyboardType="decimal-pad"
                    value={bulkQuantity}
                    onChangeText={(t) => {
                      setBulkQuantity(t);
                      if (fieldErrors.bulkQuantity) setFieldErrors({ ...fieldErrors, bulkQuantity: '' });
                    }}
                    error={fieldErrors.bulkQuantity}
                  />
                  <Input
                    label="How much did you pay in total?"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={bulkTotalPrice}
                    onChangeText={(t) => {
                      setBulkTotalPrice(t);
                      if (fieldErrors.bulkTotalPrice) setFieldErrors({ ...fieldErrors, bulkTotalPrice: '' });
                    }}
                    error={fieldErrors.bulkTotalPrice}
                  />
                  {/* A decision, not a habit — this asks what they plan to
                      sell, so it reads the same whether they have been selling
                      for years or have not started. The piece count is the
                      calculator's job either way. */}
                  <Text style={styles.fieldLabel}>How much do you want to sell at a time?</Text>
                  <View style={styles.unitRow}>
                    {unitOptions.map((option) => {
                      const selected = portionUnit === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.unitChip, selected && styles.unitChipSelected]}
                          onPress={() => setPortionUnit(option.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Input
                    placeholder={portionUnit === 'g' ? 'e.g. 250' : portionUnit === 'ml' ? 'e.g. 500' : 'e.g. 1'}
                    keyboardType="decimal-pad"
                    value={bulkPortionSize}
                    onChangeText={(t) => {
                      setBulkPortionSize(t);
                      if (fieldErrors.bulkPortionSize) setFieldErrors({ ...fieldErrors, bulkPortionSize: '' });
                    }}
                    error={fieldErrors.bulkPortionSize}
                    hint="The size of one pack or serving you plan to sell."
                  />

                  {cost.batchPieces > 0 && (
                    <View style={styles.derivedStrip}>
                      <Text style={styles.derivedText}>
                        {`${parseNum(bulkQuantity)} ${baseUnitLabel} at ${parseNum(bulkPortionSize)}${portionUnit} each makes `}
                        <Text style={styles.derivedValue}>
                          {cost.batchPieces} {cost.batchPieces === 1 ? 'pack' : 'packs'}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Left in plain sight. Folded away, extra costs were easy to
                  miss entirely — and a price that ignores ice, plastic and
                  fuel is wrong in the direction that loses money. */}
              <Input
                label="Extra cost per piece (optional)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={dagdagGastosPerPiece}
                onChangeText={setDagdagGastosPerPiece}
                hint={`e.g. ${EXTRA_COST_EXAMPLES}.`}
              />

              <Input
                label="How many do you expect to sell per day? (optional)"
                placeholder="e.g. 15"
                keyboardType="number-pad"
                value={estimatedDailyUnitsSold}
                onChangeText={setEstimatedDailyUnitsSold}
                hint="A rough guess is fine. Leave it blank if you have not started selling yet."
              />

              {cost.totalCostPerPiece > 0 && (
                <View style={styles.liveStrip}>
                  <Text style={styles.liveStripLabel}>Cost per piece</Text>
                  <Text style={styles.liveStripValue}>{peso(cost.totalCostPerPiece)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ------------------------------ STEP 3 ------------------------------ */}
          {showSection(3) && (
            <View style={isEditing ? styles.stackedSection : undefined}>
              {thinking || !suggestion ? (
                <View style={styles.thinkingCard}>
                  <ActivityIndicator color={LikhoraColors.primary} />
                  <Text style={styles.thinkingTitle}>Khora is working it out…</Text>
                  <Text style={styles.thinkingText}>
                    Checking what {name.trim() || 'this product'} usually sells for in businesses like yours.
                  </Text>
                </View>
              ) : (
                <View>
                  {priceIsStale && (
                    <TouchableOpacity
                      style={styles.staleCard}
                      onPress={askKhora}
                      activeOpacity={0.85}
                    >
                      <RefreshCw size={14} color={LikhoraColors.highlightYellow} style={{ marginRight: 8 }} />
                      <Text style={styles.staleText}>
                        Your costs changed. Tap to get a new price from Khora.
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>SELL IT FOR</Text>
                    <Text style={styles.heroValue}>{peso(price)}</Text>
                    <Text style={styles.heroSub}>
                      {peso(outcome.tuboPerPiece)} profit per piece
                    </Text>

                    <View style={styles.adjustRow}>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustPrice(-1)} activeOpacity={0.8}>
                        <Minus size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.adjustHint}>
                        {priceSource === 'ai' ? "Khora's price" : `Your price · Khora said ${peso(suggestion.sellingPrice)}`}
                      </Text>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustPrice(1)} activeOpacity={0.8}>
                        <Plus size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {priceSource === 'manual' && (
                      <TouchableOpacity style={styles.resetLink} onPress={resetToSuggestion} activeOpacity={0.7}>
                        <RotateCcw size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.resetLinkText}>{"Back to Khora's price"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {sellingBelowCost && (
                    <View style={styles.warningCard}>
                      <AlertTriangle size={15} color={LikhoraColors.errorRed} style={{ marginRight: 8 }} />
                      <Text style={styles.warningText}>
                        You lose money at this price — it is below your {peso(cost.totalCostPerPiece)} cost.
                      </Text>
                    </View>
                  )}

                  <View style={styles.khoraCard}>
                    <View style={styles.khoraHeader}>
                      <Sparkles size={14} color={LikhoraColors.aiBlue} style={{ marginRight: 6 }} />
                      <Text style={styles.khoraTitle}>Why this price</Text>
                      <View style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>{resolvedCategory}</Text>
                      </View>
                    </View>
                    <Text style={styles.khoraText}>{suggestion.reasoning}</Text>

                    {suggestion.tips.map((tip) => (
                      <View key={tip} style={styles.tipRow}>
                        <View style={styles.tipDot} />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}

                    <Text style={styles.categoryNote}>
                      {isNewCategory
                        ? `Filed under a new "${resolvedCategory}" category.`
                        : `Filed under your existing "${resolvedCategory}" category.`}
                    </Text>

                    {suggestion.source === 'offline' && (
                      <Text style={styles.offlineNote}>
                        Offline estimate — based on typical markups, not live advice from Khora.
                      </Text>
                    )}
                  </View>

                  {outcome.breakevenUnits !== null && cost.batchTotalInvestment > 0 && (
                    <View style={styles.roiCard}>
                      <Text style={styles.roiText}>
                        You earn back your <Text style={styles.roiBold}>{peso(cost.batchTotalInvestment)}</Text> capital
                        after selling <Text style={styles.roiBold}>{outcome.breakevenUnits} pcs</Text>
                        {outcome.breakevenDays ? ` (about ${outcome.breakevenDays} days)` : ''}.
                        {outcome.remainingPiecesAsProfit
                          ? ` The remaining ${outcome.remainingPiecesAsProfit} pcs are your profit.`
                          : ''}
                      </Text>
                    </View>
                  )}

                  {/* The percentages live behind a tap — useful, but not what a
                      user needs to see the moment they open the result. */}
                  <TouchableOpacity style={styles.disclosure} onPress={() => setShowMath(!showMath)} activeOpacity={0.7}>
                    <Text style={styles.disclosureText}>See the full breakdown</Text>
                    {showMath ? (
                      <ChevronUp size={16} color={LikhoraColors.textSecondary} />
                    ) : (
                      <ChevronDown size={16} color={LikhoraColors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {showMath && (
                    <View style={styles.mathCard}>
                      <MathRow label="Cost per piece" value={peso(cost.puhunan)} />
                      {cost.dagdagGastosPerPiece > 0 && (
                        <MathRow label="Extra cost per piece" value={peso(cost.dagdagGastosPerPiece)} />
                      )}
                      <MathRow label="Total cost per piece" value={peso(cost.totalCostPerPiece)} />
                      <View style={styles.mathDivider} />
                      <MathRow label="Selling price" value={peso(price)} />
                      <MathRow label="Profit per piece" value={peso(outcome.tuboPerPiece)} valueColor={LikhoraColors.successGreen} />
                      <MathRow label="Margin" value={`${outcome.marginPercent.toFixed(1)}%`} />
                      <MathRow label="Markup" value={`${outcome.markupPercentEffective.toFixed(1)}%`} />
                      {cost.batchPieces > 0 && (
                        <>
                          <View style={styles.mathDivider} />
                          <MathRow label={`Capital for ${cost.batchPieces} pcs`} value={peso(cost.batchTotalInvestment)} />
                          <MathRow label="Revenue if all sold" value={peso(outcome.batchTotalRevenuePotential)} />
                          <MathRow
                            label="Total profit"
                            value={peso(outcome.batchTotalProfitPotential)}
                            valueColor={LikhoraColors.successGreen}
                          />
                        </>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {!isEditing && step < 3 ? (
            <Button title={step === 2 ? 'Ask Khora for a price' : 'Next'} onPress={goNext} />
          ) : (
            <Button
              title={
                saving
                  ? uploadingImage
                    ? 'Uploading photo…'
                    : 'Saving…'
                  : isEditing
                    ? 'Save changes'
                    : 'Save this price'
              }
              onPress={handleSave}
              loading={saving}
              disabled={thinking || !suggestion}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this product?"
        message={`"${name.trim() || 'This product'}" and its saved pricing will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </SafeAreaView>
  );
}

const MathRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => (
  <View style={styles.mathRow}>
    <Text style={styles.mathLabel}>{label}</Text>
    <Text style={[styles.mathValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  progressItem: { flex: 1 },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: LikhoraColors.border,
    marginBottom: 6,
  },
  progressBarActive: { backgroundColor: LikhoraColors.primary },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: LikhoraColors.textPlaceholder,
    fontFamily: LikhoraFont.fontFamily,
  },
  progressLabelActive: { color: LikhoraColors.primary },

  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },

  question: {
    fontSize: 20,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 4,
  },
  questionSub: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginTop: Spacing.two,
    marginBottom: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  errorText: {
    fontSize: 12,
    color: LikhoraColors.errorRed,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },

  pickerHint: {
    fontSize: 11,
    color: LikhoraColors.textPlaceholder,
    lineHeight: 16,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },

  stepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    padding: 14,
    marginBottom: 8,
  },
  stepOptionSelected: {
    borderColor: LikhoraColors.primary,
    backgroundColor: LikhoraColors.primarySoft,
  },
  stepOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepOptionTitleSelected: { color: LikhoraColors.primary },
  stepOptionMeta: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LikhoraColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  radioSelected: { backgroundColor: LikhoraColors.primary, borderColor: LikhoraColors.primary },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    padding: 10,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    borderStyle: 'dashed',
  },
  photoThumb: { width: 40, height: 40, borderRadius: Radius.medium, marginRight: 12 },
  photoThumbEmpty: {
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },

  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.three,
  },
  modeCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  modeCardSelected: { borderColor: LikhoraColors.primary, backgroundColor: LikhoraColors.primarySoft },
  modeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  modeLabelSelected: { color: LikhoraColors.primary },
  modeCaption: {
    fontSize: 9,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  modeCaptionSelected: { color: LikhoraColors.primary },

  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: Spacing.two,
  },
  disclosureText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  unitRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    backgroundColor: '#FFFFFF',
  },
  unitChipSelected: {
    backgroundColor: LikhoraColors.primarySoft,
    borderColor: LikhoraColors.primary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  unitChipTextSelected: { color: LikhoraColors.primary },
  derivedStrip: {
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    marginBottom: Spacing.three,
  },
  derivedText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  derivedValue: {
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
  },
  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    marginTop: Spacing.three,
  },
  liveStripLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  liveStripValue: {
    fontSize: 17,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },

  stackedSection: {
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  staleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.highlightYellowSoft,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  staleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
  },
  thinkingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  thinkingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginTop: Spacing.three,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  thinkingText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },

  heroCard: {
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: LikhoraFont.fontFamily,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: Spacing.three,
  },
  adjustBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustHint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: LikhoraFont.fontFamily,
  },
  resetLink: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  resetLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontFamily: LikhoraFont.fontFamily,
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.errorRed,
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
  },

  khoraCard: {
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderRadius: Radius.xlarge,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  khoraHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  khoraTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  khoraText: {
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    lineHeight: 20,
    fontFamily: LikhoraFont.fontFamily,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: LikhoraColors.aiBlue,
    marginTop: 7,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryNote: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  offlineNote: {
    fontSize: 10,
    color: LikhoraColors.textPlaceholder,
    marginTop: 10,
    fontStyle: 'italic',
    fontFamily: LikhoraFont.fontFamily,
  },

  roiCard: {
    backgroundColor: LikhoraColors.successGreenSoft,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  roiText: {
    fontSize: 12,
    color: LikhoraColors.textPrimary,
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  roiBold: { fontWeight: '800' },

  mathCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    padding: Spacing.three,
  },
  mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  mathLabel: { fontSize: 12, color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily },
  mathValue: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  mathDivider: { height: 1, backgroundColor: LikhoraColors.border, marginVertical: 8 },

  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
});
