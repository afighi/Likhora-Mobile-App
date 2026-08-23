import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Send, ImageIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { RoadmapTask, replaceUserRoadmap, createUserTemplate } from '@/services/supabase';

interface BuilderStep {
  localId: string;
  title: string;
  category: string;
  desc: string;
  subStepsText: string; // one checklist item per line
}

const STEP_CATEGORIES = ['Permits', 'Supplies', 'Finance', 'Launch', 'Marketing', 'Planning', 'General'];

const newStep = (): BuilderStep => ({
  localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  category: 'General',
  desc: '',
  subStepsText: '',
});

export default function TemplateBuilderScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [templateSummary, setTemplateSummary] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [steps, setSteps] = useState<BuilderStep[]>([newStep()]);
  const [saving, setSaving] = useState(false);

  const updateStep = (localId: string, patch: Partial<BuilderStep>) => {
    setSteps((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, newStep()]);

  const removeStep = (localId: string) => {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.localId !== localId) : prev));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = (): RoadmapTask[] | null => {
    if (!templateName.trim()) {
      Alert.alert('Name your template', 'Give your template a business name, e.g. "Weekend Coffee Cart Plan".');
      return null;
    }
    const validSteps = steps.filter((s) => s.title.trim());
    if (validSteps.length === 0) {
      Alert.alert('Add at least one step', 'A template needs at least one titled step.');
      return null;
    }
    return validSteps.map((s, idx) => ({
      user_id: user?.uid || '',
      title: s.title.trim(),
      category: s.category,
      status: 'Pending' as const,
      desc: s.desc.trim(),
      step_order: idx + 1,
      sub_steps: s.subStepsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, subIdx) => ({ id: `${idx + 1}-${subIdx + 1}`, title: line, completed: false })),
    }));
  };

  // Saves this template to the user's personal library (public.user_templates)
  // — it does NOT touch their active roadmap or publish anywhere. Sharing to
  // Community now happens separately: from the Community tab, the user picks
  // which saved template (or their active roadmap) they want to publish,
  // instead of this screen deciding that for them.
  const handleSaveTemplate = async () => {
    if (!user?.uid) return;
    const tasks = validate();
    if (!tasks) return;

    setSaving(true);
    const { error } = await createUserTemplate({
      user_id: user.uid,
      name: templateName.trim(),
      business_type: templateType.trim() || userProfile?.business_type || '',
      summary: templateSummary.trim(),
      image_url: templateImageUrl.trim(),
      template_data: tasks,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save template', 'Please try again.');
      return;
    }

    Alert.alert(
      'Template saved',
      `"${templateName.trim()}" is now in your template library. You can share it from the Community tab anytime, or set it as your active roadmap now.`,
      [
        {
          text: 'Set as My Active Roadmap',
          onPress: async () => {
            const { error: roadmapError } = await replaceUserRoadmap(user.uid, tasks);
            if (roadmapError) {
              Alert.alert('Could not update your roadmap', 'Your template is still saved in your library — you can try setting it active again later.');
              return;
            }
            router.replace('/roadmap');
          },
        },
        { text: 'Done', style: 'cancel', onPress: () => router.replace('/community') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/roadmap'))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Create Your Own Template</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.introText}>
            Build a full business launch plan from scratch — your own steps, in your own order. It's saved to your template library; from there you can set it as your active roadmap, or share it from the Community tab whenever you're ready.
          </Text>

          {/* Template Identity */}
          <Text style={styles.fieldLabel}>Template / business name</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g. Weekend Coffee Cart Plan"
            placeholderTextColor={LikhoraColors.textPlaceholder}
          />

          <Text style={styles.fieldLabel}>Business type (optional)</Text>
          <TextInput
            style={styles.input}
            value={templateType}
            onChangeText={setTemplateType}
            placeholder="e.g. Food Stall, Online Shop"
            placeholderTextColor={LikhoraColors.textPlaceholder}
          />

          <Text style={styles.fieldLabel}>Description (required to publish to Community)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={templateSummary}
            onChangeText={setTemplateSummary}
            placeholder="What makes this plan useful? Who is it for?"
            placeholderTextColor={LikhoraColors.textPlaceholder}
            multiline
            maxLength={280}
          />

          <Text style={styles.fieldLabel}>Cover image (optional)</Text>
          <View style={styles.imageInputRow}>
            <ImageIcon size={16} color={LikhoraColors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.imageInput}
              value={templateImageUrl}
              onChangeText={setTemplateImageUrl}
              placeholder="Paste an image URL (e.g. from Google/Unsplash)"
              placeholderTextColor={LikhoraColors.textPlaceholder}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {templateImageUrl.trim() ? (
            <Image
              source={{ uri: templateImageUrl.trim() }}
              style={styles.imagePreview}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={styles.imageHintText}>
              Shown as the cover photo on your template if you publish it to Community — makes it stand out instead of a plain text card.
            </Text>
          )}

          {/* Steps Builder */}
          <View style={styles.stepsHeaderRow}>
            <Text style={styles.sectionTitle}>Your steps ({steps.length})</Text>
          </View>

          {steps.map((step, idx) => (
            <View key={step.localId} style={styles.stepCard}>
              <View style={styles.stepCardTopRow}>
                <Text style={styles.stepNumberBadge}>Step {idx + 1}</Text>
                <View style={styles.stepCardControls}>
                  <TouchableOpacity onPress={() => moveStep(idx, -1)} disabled={idx === 0} hitSlop={8}>
                    <ChevronUp size={18} color={idx === 0 ? LikhoraColors.textPlaceholder : LikhoraColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} hitSlop={8}>
                    <ChevronDown size={18} color={idx === steps.length - 1 ? LikhoraColors.textPlaceholder : LikhoraColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeStep(step.localId)} disabled={steps.length === 1} hitSlop={8}>
                    <Trash2 size={18} color={steps.length === 1 ? LikhoraColors.textPlaceholder : LikhoraColors.errorRed} />
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.stepInput}
                value={step.title}
                onChangeText={(t) => updateStep(step.localId, { title: t })}
                placeholder="Step title (e.g. Register with DTI)"
                placeholderTextColor={LikhoraColors.textPlaceholder}
              />

              <View style={styles.categoryChipRow}>
                {STEP_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, step.category === cat && styles.categoryChipActive]}
                    onPress={() => updateStep(step.localId, { category: cat })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryChipText, step.category === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.stepInput, styles.textAreaSmall]}
                value={step.desc}
                onChangeText={(t) => updateStep(step.localId, { desc: t })}
                placeholder="Short description (optional)"
                placeholderTextColor={LikhoraColors.textPlaceholder}
                multiline
              />

              <Text style={styles.subStepsLabel}>Checklist items (one per line, optional)</Text>
              <TextInput
                style={[styles.stepInput, styles.textAreaSmall]}
                value={step.subStepsText}
                onChangeText={(t) => updateStep(step.localId, { subStepsText: t })}
                placeholder={'e.g.\nVisit the barangay hall\nBring 2 valid IDs\nPay the permit fee'}
                placeholderTextColor={LikhoraColors.textPlaceholder}
                multiline
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addStepBtn} onPress={addStep} activeOpacity={0.8}>
            <Plus size={16} color={LikhoraColors.primary} />
            <Text style={styles.addStepBtnText}>Add another step</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.publishBtn}
            onPress={handleSaveTemplate}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.publishBtnText}>Save template</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: 40 },
  introText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.four,
    fontFamily: LikhoraFont.fontFamily,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  input: {
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.large,
    paddingHorizontal: 14,
    height: 48,
    color: LikhoraColors.textPrimary,
    backgroundColor: LikhoraColors.inputBackground,
    fontFamily: LikhoraFont.fontFamily,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  imageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.large,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: LikhoraColors.inputBackground,
  },
  imageInput: {
    flex: 1,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: Radius.large,
    marginTop: 10,
    backgroundColor: LikhoraColors.inputBackground,
  },
  imageHintText: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 6,
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepsHeaderRow: { marginTop: Spacing.five, marginBottom: Spacing.two },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    marginBottom: Spacing.three,
  },
  stepCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumberBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepCardControls: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  stepInput: {
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  textAreaSmall: { height: 70, paddingTop: 10, textAlignVertical: 'top' },
  categoryChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  categoryChipActive: { backgroundColor: LikhoraColors.primary },
  categoryChipText: { fontSize: 11, fontWeight: '700', color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily },
  categoryChipTextActive: { color: '#FFFFFF' },
  subStepsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: LikhoraColors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    height: 48,
    marginTop: 4,
  },
  addStepBtnText: { color: LikhoraColors.primary, fontWeight: '800', fontSize: 14, fontFamily: LikhoraFont.fontFamily },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    gap: 10,
  },
  publishBtn: {
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, fontFamily: LikhoraFont.fontFamily },
});
