import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Sparkles, Briefcase, Share2, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserRoadmap,
  fetchUserProducts,
  fetchSuppliersFromSupabase,
  fetchBusinessPortfolio,
  saveBusinessPortfolio,
  BusinessPortfolio,
  RoadmapTask,
  Product,
  SupplierItem,
} from '@/services/supabase';
import { generateBusinessNames, BusinessNameSuggestion } from '@/services/businessPlanAdvisor';

export default function BusinessPortfolioScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<BusinessPortfolio | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapTask[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  const [keywords, setKeywords] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<BusinessNameSuggestion[]>([]);
  const [selectedName, setSelectedName] = useState<BusinessNameSuggestion | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const [roadmapRes, productsRes, suppliersRes, portfolioRes] = await Promise.all([
      fetchUserRoadmap(user.uid),
      fetchUserProducts(user.uid),
      fetchSuppliersFromSupabase(undefined, undefined, userProfile?.location),
      fetchBusinessPortfolio(user.uid),
    ]);

    setRoadmap(roadmapRes.data || []);
    setProducts(productsRes.data || []);
    setSuppliers((suppliersRes.data || []).slice(0, 5));

    if (portfolioRes.data) {
      setPortfolio(portfolioRes.data);
      setDescription(portfolioRes.data.business_description);
      if (portfolioRes.data.business_name) {
        setSelectedName({ name: portfolioRes.data.business_name, tagline: '' });
      }
    }
    setLoading(false);
  }, [user, userProfile?.location]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGenerateNames = async () => {
    if (!keywords.trim()) {
      Alert.alert(
        'Keywords Needed',
        'Please enter at least one keyword or detail about your business (e.g. affordable, student-friendly, Bulacan) to generate tailored names.'
      );
      return;
    }

    setGenerating(true);
    const { suggestions: results, source } = await generateBusinessNames({
      businessType: userProfile?.business_type || 'small business',
      keywords: keywords.trim(),
      location: userProfile?.location,
    });
    setSuggestions(results);
    setGenerating(false);

    if (source === 'offline') {
      Alert.alert(
        'Suggestions Unavailable',
        'Could not reach Khora AI right now. Showing offline suggestions — check your connection and try again.'
      );
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !selectedName) {
      Alert.alert('Pick a business name first', 'Generate names above and choose one before saving.');
      return;
    }
    setSaving(true);
    const { data, error } = await saveBusinessPortfolio({
      id: portfolio?.id,
      user_id: user.uid,
      business_name: selectedName.name,
      business_description: description,
      ai_name_suggestions: suggestions,
      selected_roadmap_snapshot: roadmap,
      selected_costing_snapshot: products,
      selected_suppliers: suppliers,
      exported_at: portfolio?.exported_at ?? null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', 'Please try again.');
      return;
    }
    setPortfolio(data);
    Alert.alert('Saved', 'Your business portfolio has been saved.');
  };

  const handleShare = async () => {
    if (!selectedName) return;
    const completedTasks = roadmap.filter((t) => t.status === 'Completed').length;
    const lines = [
      `${selectedName.name}${selectedName.tagline ? ` — ${selectedName.tagline}` : ''}`,
      '',
      description || '(No description yet)',
      '',
      `Roadmap progress: ${completedTasks}/${roadmap.length} steps completed`,
      `Priced products: ${products.length}`,
      suppliers.length ? `Suppliers: ${suppliers.map((s) => s.name).join(', ')}` : '',
      '',
      'Built with LikhAI',
    ].filter(Boolean);

    try {
      await Share.share({ message: lines.join('\n') });
      if (portfolio?.id && user?.uid) {
        await saveBusinessPortfolio({
          id: portfolio.id,
          user_id: user.uid,
          business_name: selectedName.name,
          business_description: description,
          ai_name_suggestions: suggestions,
          selected_roadmap_snapshot: roadmap,
          selected_costing_snapshot: products,
          selected_suppliers: suppliers,
          exported_at: new Date().toISOString(),
        });
      }
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={LikhoraColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/roadmap'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Business Portfolio</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Pick an AI-generated name, write a short description, and compile a snapshot of your roadmap,
          pricing, and suppliers into one shareable business portfolio.
        </Text>

        {/* Name generator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Name</Text>
          <TextInput
            value={keywords}
            onChangeText={setKeywords}
            placeholder="Keywords or vibe (e.g. affordable, student-friendly)"
            placeholderTextColor={LikhoraColors.textPlaceholder}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateNames}
            disabled={generating}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.generateBtnText}>{generating ? 'Generating…' : 'Generate Names'}</Text>
          </TouchableOpacity>

          {suggestions.map((s, idx) => {
            const isSelected = selectedName?.name === s.name;
            return (
              <TouchableOpacity
                key={`${s.name}-${idx}`}
                style={[styles.suggestionRow, isSelected && styles.suggestionRowSelected]}
                onPress={() => setSelectedName(s)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName}>{s.name}</Text>
                  {!!s.tagline && <Text style={styles.suggestionTagline}>{s.tagline}</Text>}
                </View>
                {isSelected && <Check size={18} color={LikhoraColors.primary} />}
              </TouchableOpacity>
            );
          })}

          {selectedName && (
            <View style={styles.selectedBanner}>
              <Text style={styles.selectedBannerText}>Selected: {selectedName.name}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Write a short description of your business..."
            placeholderTextColor={LikhoraColors.textPlaceholder}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        {/* Snapshot summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What&apos;s Included</Text>
          <View style={styles.summaryRow}>
            <Briefcase size={16} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.summaryText}>
              {roadmap.filter((t) => t.status === 'Completed').length}/{roadmap.length} roadmap steps completed
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Briefcase size={16} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.summaryText}>{products.length} priced product{products.length === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Briefcase size={16} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.summaryText}>
              {suppliers.length} supplier{suppliers.length === 1 ? '' : 's'} nearby
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Portfolio'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Share2 size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.shareBtnText}>Share Portfolio</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  scrollContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: 60 },
  introText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: Spacing.three,
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  card: {
    backgroundColor: LikhoraColors.cardBackground,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.cardBorder,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: Spacing.two,
    fontFamily: LikhoraFont.fontFamily,
  },
  input: {
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: LikhoraColors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: Spacing.two,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    marginBottom: Spacing.two,
  },
  generateBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, fontFamily: LikhoraFont.fontFamily },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: Spacing.two,
  },
  suggestionRowSelected: {
    borderColor: LikhoraColors.primary,
    backgroundColor: LikhoraColors.primarySoft,
  },
  suggestionName: { fontSize: 14, fontWeight: '700', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  suggestionTagline: { fontSize: 12, color: LikhoraColors.textSecondary, marginTop: 2, fontFamily: LikhoraFont.fontFamily },
  selectedBanner: {
    marginTop: Spacing.two,
    backgroundColor: LikhoraColors.successGreenSoft,
    borderRadius: Radius.medium,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedBannerText: { color: LikhoraColors.successGreen, fontWeight: '700', fontSize: 12, fontFamily: LikhoraFont.fontFamily },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryText: { fontSize: 13, color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily },
  saveBtn: {
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: Spacing.two,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, fontFamily: LikhoraFont.fontFamily },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 12,
  },
  shareBtnText: { color: LikhoraColors.primary, fontWeight: '800', fontSize: 14, fontFamily: LikhoraFont.fontFamily },
});
