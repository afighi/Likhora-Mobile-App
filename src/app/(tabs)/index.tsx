import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  Bell, 
  Sparkles, 
  ArrowRight, 
  Compass,
  CheckCircle2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fetchUserRoadmap, getCachedRoadmapTasks, getDefaultPhilippineRoadmapTasks, RoadmapTask } from '@/services/supabase';
import { askKhoraAI } from '@/services/claude';
import { useNotification } from '@/context/NotificationContext';
import { AppLogo } from '@/components/ui/AppLogo';

export default function DashboardHomeScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { unreadCount } = useNotification();

  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);

  // Auto-fetch live roadmap progress from Supabase & cache whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadUserProgress = async () => {
        const uid = user?.uid || 'guest';
        const { data } = await fetchUserRoadmap(uid);
        if (isMounted) {
          if (data && data.length > 0) {
            setTasks(data);
          } else {
            const cached = getCachedRoadmapTasks(uid);
            if (cached && cached.length > 0) {
              setTasks(cached);
            } else {
              const defaults = getDefaultPhilippineRoadmapTasks(uid, userProfile?.business_type, userProfile?.location);
              setTasks(defaults);
            }
          }
        }
      };
      loadUserProgress();
      return () => {
        isMounted = false;
      };
    }, [user?.uid, userProfile?.business_type, userProfile?.location])
  );

  // Dynamic Progress Percentage Calculation
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const progressPercent = tasks.length > 0 
    ? Math.round((completedCount / tasks.length) * 100) 
    : 0;

  const nextPendingTask = tasks.find(t => t.status === 'Pending');
  const nextMilestoneText = nextPendingTask 
    ? nextPendingTask.title 
    : (completedCount > 0 && completedCount === tasks.length 
        ? 'All launch steps completed! Ready for business opening.' 
        : 'Complete business onboarding wizard');

  const handleGetAITip = async () => {
    setLoadingAi(true);
    const res = await askKhoraAI(
      `Give a concise 2-sentence launch recommendation for a Filipino entrepreneur starting a "${userProfile?.business_type || 'small business'}" in "${userProfile?.location || 'the Philippines'}".`
    );
    setAiTip(res.content);
    setLoadingAi(false);
  };

  const firstName = userProfile?.full_name?.split(' ')[0] || 'Entrepreneur';
  const userInitials = userProfile?.full_name 
    ? userProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'LK';

  const hasStartedOnboarding = !userProfile?.onboarded && (userProfile?.onboarding_step ?? 0) > 0;
  const onboardingActionLabel = userProfile?.onboarded
    ? 'Continue Launch Roadmap'
    : hasStartedOnboarding
      ? 'Continue Onboarding'
      : 'Start Onboarding Wizard';

  // Branching AI Advice Default
  const getBranchingAiRecommendation = () => {
    if (!userProfile?.onboarded) {
      return 'Complete your 7-step onboarding to generate your tailored Philippine permit checklist and location analysis.';
    }
    if (userProfile?.budget?.includes('5,000')) {
      return 'With a lean starting budget, focus on direct supplier sourcing from Divisoria and protect your emergency cash runway.';
    }
    return `Your ${userProfile?.business_type || 'business'} in ${userProfile?.location || 'your area'} is set for permits & setup. Focus on Barangay clearance first.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. TOP HEADER: App Logo (left) | Notification Bell & Profile Avatar (right - Home Page Only) */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <AppLogo size={32} />
          </View>

          {/* Side-by-side Top-Right Header Actions */}
          <View style={styles.topRightActions}>
            <TouchableOpacity 
              style={styles.headerIconCircle} 
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Bell size={19} color={LikhoraColors.textPrimary} />
              {unreadCount > 0 && <View style={styles.unreadDot} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarCircleBtn}
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.avatarInitialsText}>{userInitials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. GREETING SECTION */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            Kumusta, <Text style={{ color: LikhoraColors.primary }}>{firstName}</Text>
          </Text>
          <Text style={styles.greetingSubtitle}>
            Your {userProfile?.business_type || 'business'} is {progressPercent}% to launch
          </Text>
        </View>

        {/* 3. HERO ROADMAP WIDGET WITH LIVE WORKING PERCENTAGE */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
            <View style={styles.widgetIconBg}>
              <Compass size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.widgetTag}>
                {userProfile?.business_name || 'MY BUSINESS VENTURE'}
              </Text>
              <Text style={styles.widgetTitle}>
                {userProfile?.business_type || 'Business Launch'}
              </Text>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Next Milestone */}
          <View style={styles.nextTaskRow}>
            <CheckCircle2 size={18} color="#F2E5F3" style={{ marginRight: 8 }} />
            <Text style={styles.nextTaskText} numberOfLines={2}>
              Next: {nextMilestoneText}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => {
              if (userProfile?.onboarded) {
                router.push('/roadmap');
              } else {
                router.push('/onboarding');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {onboardingActionLabel}
            </Text>
            <ArrowRight size={16} color={LikhoraColors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* 4. AI ADVISOR CARD */}
        <View style={styles.aiAdvisorCard}>
          <View style={styles.aiAdvisorHeader}>
            <View style={styles.aiIconBadge}>
              <Sparkles size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.aiAdvisorTitle}>Likhora AI Advisor</Text>
          </View>

          <Text style={styles.aiAdviceText}>
            {aiTip || getBranchingAiRecommendation()}
          </Text>

          <TouchableOpacity 
            style={styles.aiActionBtn}
            onPress={handleGetAITip}
            disabled={loadingAi}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.aiActionBtnText}>
              {loadingAi ? 'Asking Khora AI...' : 'Get Fresh AI Launch Tip'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. QUICK ACTIONS GRID */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/suppliers')}
            activeOpacity={0.8}
          >
            <Text style={styles.gridCardTitle}>Direct Suppliers</Text>
            <Text style={styles.gridCardSub}>Source local wholesale goods</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/ai-assistant')}
            activeOpacity={0.8}
          >
            <Text style={styles.gridCardTitle}>Ask Khora AI</Text>
            <Text style={styles.gridCardSub}>24/7 business guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/roadmap')}
            activeOpacity={0.8}
          >
            <Text style={styles.gridCardTitle}>Permit Checklist</Text>
            <Text style={styles.gridCardSub}>DTI, Barangay & Mayor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/community')}
            activeOpacity={0.8}
          >
            <Text style={styles.gridCardTitle}>PH Community</Text>
            <Text style={styles.gridCardSub}>Connect with founders</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: 110,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
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
  avatarCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: LikhoraColors.softPurple,
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  greetingSection: {
    marginBottom: Spacing.four,
  },
  greetingTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    letterSpacing: -0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  widgetCard: {
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    elevation: 4,
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  widgetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  widgetTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E4CFE5',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  percentBadge: {
    backgroundColor: LikhoraColors.successGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  percentBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: LikhoraColors.successGreen,
    borderRadius: Radius.pill,
  },
  nextTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextTaskText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F2E5F3',
    fontFamily: LikhoraFont.fontFamily,
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Radius.pill,
  },
  actionBtnText: {
    color: LikhoraColors.primary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  aiAdvisorCard: {
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.five,
    borderWidth: 1.5,
    borderColor: '#C3E8F8',
  },
  aiAdvisorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LikhoraColors.aiBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAdvisorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  aiAdviceText: {
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    lineHeight: 19,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#C3E8F8',
  },
  aiActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(42, 33, 48, 0.07)',
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  gridCardSub: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
});
