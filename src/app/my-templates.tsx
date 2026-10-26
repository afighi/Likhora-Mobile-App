import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, Trash2, ImageOff, ListChecks } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserTemplate, fetchUserTemplates, deleteUserTemplate, replaceUserRoadmap } from '@/services/supabase';
import {
  getSavedRoadmaps,
  saveAllRoadmaps,
  setActiveRoadmapMeta,
  UserSavedRoadmap,
} from '@/services/roadmapStorage';

export default function MyTemplatesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const { data } = await fetchUserTemplates(user.uid);
    setTemplates(data || []);
    setLoading(false);
  }, [user?.uid]);

  // Refresh every time this screen comes into focus, so a template just
  // saved in the builder (or removed here) is always reflected.
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const handleDelete = (template: UserTemplate) => {
    Alert.alert(
      'Delete this template?',
      `"${template.name}" will be permanently removed from your library. This does not affect your active roadmap or anything already published to Community.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            const { error } = await deleteUserTemplate(template.id, user.uid);
            if (error) {
              Alert.alert('Could not delete template', 'Please try again.');
              return;
            }
            setTemplates((prev) => prev.filter((t) => t.id !== template.id));
          },
        },
      ]
    );
  };

  const handleSetActive = (template: UserTemplate) => {
    if (!user?.uid) return;
    Alert.alert(
      'Set as your active roadmap?',
      `This sets "${template.name}" as your active roadmap. Your previous roadmaps will remain safely preserved and accessible in the Templates tab.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Active',
          onPress: async () => {
            const existingRoadmaps = await getSavedRoadmaps();
            const roadmapId = template.id || `custom-${Date.now()}`;
            const roadmapTitle = template.name;
            const existingIdx = existingRoadmaps.findIndex(
              (r) => r.id === roadmapId || r.title.toLowerCase() === roadmapTitle.toLowerCase()
            );

            let updatedList: UserSavedRoadmap[];
            if (existingIdx !== -1) {
              updatedList = [...existingRoadmaps];
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                updatedAt: new Date().toISOString(),
              };
            } else {
              const newSaved: UserSavedRoadmap = {
                id: roadmapId,
                title: roadmapTitle,
                businessType: template.business_type,
                tasks: template.template_data,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };
              updatedList = [newSaved, ...existingRoadmaps];
            }

            await saveAllRoadmaps(updatedList);
            await setActiveRoadmapMeta(roadmapId, roadmapTitle);
            await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(template.template_data));

            const { error } = await replaceUserRoadmap(user.uid, template.template_data);
            if (error) {
              Alert.alert('Could not update your roadmap', 'Please try again.');
              return;
            }
            router.replace('/roadmap');
          },
        },
      ]
    );
  };

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
        <Text style={styles.topBarTitle}>My Templates</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={LikhoraColors.primary} />
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.emptyState}>
          <ListChecks size={32} color={LikhoraColors.textPlaceholder} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No saved templates yet</Text>
          <Text style={styles.emptyText}>
            Templates you build are saved here so you can reuse, update, or share them anytime — without losing your current active roadmap.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/template-builder')} activeOpacity={0.85}>
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCtaText}>Create your first template</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.introText}>
            {templates.length} saved template{templates.length === 1 ? '' : 's'}. Set one as your active roadmap, or remove ones you no longer need.
          </Text>

          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              {template.image_url ? (
                <Image source={{ uri: template.image_url }} style={styles.templateImage} contentFit="cover" transition={150} />
              ) : (
                <View style={[styles.templateImage, styles.templateImagePlaceholder]}>
                  <ImageOff size={20} color={LikhoraColors.textPlaceholder} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>
                <Text style={styles.templateMeta} numberOfLines={1}>
                  {template.template_data?.length || 0} steps{template.business_type ? ` • ${template.business_type}` : ''}
                </Text>
                {template.summary ? (
                  <Text style={styles.templateSummary} numberOfLines={2}>{template.summary}</Text>
                ) : null}

                <View style={styles.templateActionsRow}>
                  <TouchableOpacity style={styles.setActiveBtn} onPress={() => handleSetActive(template)} activeOpacity={0.8}>
                    <Text style={styles.setActiveBtnText}>Set as active roadmap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(template)}
                    activeOpacity={0.8}
                    hitSlop={8}
                    accessibilityLabel={`Delete ${template.name}`}
                  >
                    <Trash2 size={16} color={LikhoraColors.errorRed} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    fontFamily: LikhoraFont.fontFamily,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  emptyCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, fontFamily: LikhoraFont.fontFamily },
  scrollContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: 40 },
  introText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    marginBottom: Spacing.three,
  },
  templateImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.large,
    marginRight: 12,
    backgroundColor: LikhoraColors.inputBackground,
  },
  templateImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateMeta: {
    fontSize: 12,
    color: LikhoraColors.primary,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateSummary: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  setActiveBtn: {
    flex: 1,
    backgroundColor: LikhoraColors.secondaryLavender,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  setActiveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
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
});
