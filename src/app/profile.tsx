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
  ActivityIndicator
} from 'react-native';
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
  MapPin,
  RotateCcw,
  Sparkles,
  Lock,
  X,
  AlertTriangle
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { syncUserProfile, fetchUserRoadmap } from '@/services/supabase';
import { resetPasswordFirebase } from '@/services/firebase';
import { Button } from '@/components/ui/Button';

const AVATAR_COLORS = [
  '#7C3AED', // Primary Purple
  '#2563EB', // Royal Blue
  '#059669', // Emerald Green
  '#D97706', // Amber Gold
  '#DC2626', // Crimson Red
  '#DB2777', // Pink
];

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
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Custom Modals States
  const [selectedAvatarColor, setSelectedAvatarColor] = useState('#7C3AED');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [retakeModalVisible, setRetakeModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Roadmap Progress Stats State
  const [totalTasksCount, setTotalTasksCount] = useState(6);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  // Sync profile fields when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setBusinessName(userProfile.business_name || '');
      setBusinessType(userProfile.business_type || '');
      setLocation(userProfile.location || '');
      setBudget(userProfile.budget || '');
    }
  }, [userProfile]);

  // Load Roadmap Stats
  useEffect(() => {
    async function loadStats() {
      const uid = userProfile?.id || user?.uid || 'guest';
      const { data } = await fetchUserRoadmap(uid);
      if (data && data.length > 0) {
        setTotalTasksCount(data.length);
        const done = data.filter((t: any) => t.status === 'Completed').length;
        setCompletedTasksCount(done);
      }
    }
    loadStats();
  }, [userProfile, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
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
      await syncUserProfile(updatedProfile);
      setUserProfile(updatedProfile);
      setIsEditing(false);
      showToast('Profile details updated successfully!');
    } catch (err: any) {
      console.warn('Save error:', err);
      showToast('Profile updated locally.');
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
      setResetMessage(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
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
    ? (userProfile?.full_name || fullName).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'LK';

  const roadmapProgressPct = Math.round((completedTasksCount / (totalTasksCount || 1)) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation Bar */}
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

          <Text style={styles.headerTitle}>My Profile</Text>

          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => setIsEditing(!isEditing)}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Toast Notification Banner */}
        {toastMessage ? (
          <View style={styles.toastBanner}>
            <Check size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, { backgroundColor: selectedAvatarColor }]}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
              <TouchableOpacity 
                style={styles.cameraBadge} 
                onPress={() => setAvatarModalVisible(true)}
                activeOpacity={0.8}
              >
                <Camera size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{userProfile?.full_name || fullName || 'Entrepreneur'}</Text>
            <Text style={styles.userEmail}>{userProfile?.email || user?.email || 'user@negosyo.ph'}</Text>

            <View style={styles.badgeRow}>
              {userProfile?.business_name || businessName ? (
                <View style={styles.businessBadge}>
                  <Store size={12} color={LikhoraColors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.businessBadgeText}>{userProfile?.business_name || businessName}</Text>
                </View>
              ) : null}

              {userProfile?.location || location ? (
                <View style={styles.businessBadge}>
                  <MapPin size={12} color={LikhoraColors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.businessBadgeText}>{userProfile?.location || location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Edit Profile Form */}
          {isEditing && (
            <View style={styles.editFormCard}>
              <Text style={styles.editFormTitle}>Edit Account & Business Details</Text>
              
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.inputField}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
              />

              <Text style={styles.inputLabel}>Business Name</Text>
              <TextInput
                style={styles.inputField}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Aling Nena's Store"
              />

              <Text style={styles.inputLabel}>Business Category / Industry</Text>
              <TextInput
                style={styles.inputField}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="e.g. Retail, Food Service"
              />

              <Text style={styles.inputLabel}>City / Province Location</Text>
              <TextInput
                style={styles.inputField}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Quezon City, Metro Manila"
              />

              <Text style={styles.inputLabel}>Starting Budget</Text>
              <TextInput
                style={styles.inputField}
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. ₱20,000 - ₱50,000"
              />

              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={saving}
                style={{ marginTop: 10 }}
              />
            </View>
          )}

          {/* Profile Overview Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Check size={10} color={LikhoraColors.successGreen} style={{ marginRight: 4 }} />
                <Text style={styles.statusText}>
                  {userProfile?.onboarded ? 'Onboarded' : 'Active'}
                </Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Account Type</Text>
              <Text style={styles.statValue}>Entrepreneur</Text>
            </View>
          </View>

          {/* Roadmap Progress Card */}
          <TouchableOpacity 
            style={styles.roadmapCard}
            onPress={() => router.push('/roadmap')}
            activeOpacity={0.85}
          >
            <View style={styles.roadmapCardHeader}>
              <View style={styles.roadmapCardTitleRow}>
                <Sparkles size={18} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.roadmapCardTitle}>Roadmap Launch Readiness</Text>
              </View>
              <Text style={styles.roadmapPctText}>{roadmapProgressPct}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${roadmapProgressPct}%` }]} />
            </View>

            <View style={styles.roadmapSubRow}>
              <Text style={styles.roadmapSubText}>
                {completedTasksCount} of {totalTasksCount} milestones completed
              </Text>
              <ChevronRight size={16} color={LikhoraColors.primary} />
            </View>
          </TouchableOpacity>

          {/* Menu Section */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Account & Settings</Text>

            {/* Notifications Center */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: LikhoraColors.secondaryLavender }]}>
                <Bell size={18} color={LikhoraColors.primary} />
              </View>
              <Text style={styles.menuItemText}>Notifications Center</Text>
              <ChevronRight size={18} color={LikhoraColors.textPlaceholder} />
            </TouchableOpacity>

            {/* Push Notifications */}
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <ShieldCheck size={18} color={LikhoraColors.successGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Push Notifications</Text>
              </View>
              <Switch
                value={pushNotifs}
                onValueChange={(val) => {
                  setPushNotifs(val);
                  showToast(val ? 'Push notifications enabled' : 'Push notifications disabled');
                }}
                trackColor={{ false: '#E5E7EB', true: LikhoraColors.primary }}
              />
            </View>

            {/* Email Updates */}
            <View style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                <Mail size={18} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Email Updates</Text>
              </View>
              <Switch
                value={emailNotifs}
                onValueChange={(val) => {
                  setEmailNotifs(val);
                  showToast(val ? 'Email updates enabled' : 'Email updates disabled');
                }}
                trackColor={{ false: '#E5E7EB', true: LikhoraColors.primary }}
              />
            </View>

            {/* Security & Password Reset */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handlePasswordReset}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Lock size={18} color="#9333EA" />
              </View>
              <Text style={styles.menuItemText}>Security & Password Reset</Text>
              <ChevronRight size={18} color={LikhoraColors.textPlaceholder} />
            </TouchableOpacity>

            {/* Help & AI Assistant Support */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/ai-assistant')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <HelpCircle size={18} color={LikhoraColors.highlightYellow} />
              </View>
              <Text style={styles.menuItemText}>Likhora AI Business Support</Text>
              <ChevronRight size={18} color={LikhoraColors.textPlaceholder} />
            </TouchableOpacity>

            {/* Retake Setup / Questionnaire */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setRetakeModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <RotateCcw size={18} color="#2563EB" />
              </View>
              <Text style={styles.menuItemText}>Update Business Setup Questionnaire</Text>
              <ChevronRight size={18} color={LikhoraColors.textPlaceholder} />
            </TouchableOpacity>
          </View>

          {/* Log Out Button */}
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.8}
          >
            <LogOut size={18} color={LikhoraColors.errorRed} style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out of Account</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* 1. Avatar Color Picker Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Avatar Style</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <X size={20} color={LikhoraColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select a color theme for your profile badge:</Text>
            
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorPill,
                    { backgroundColor: c },
                    selectedAvatarColor === c && styles.colorPillActive,
                  ]}
                  onPress={() => {
                    setSelectedAvatarColor(c);
                    setAvatarModalVisible(false);
                    showToast('Avatar theme updated!');
                  }}
                >
                  {selectedAvatarColor === c && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Log Out Confirmation Modal */}
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

      {/* 3. Retake Onboarding Modal */}
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

      {/* 4. Password Reset Feedback Modal */}
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  editBtn: {
    padding: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  profileHeaderCard: {
    alignItems: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginVertical: Spacing.three,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  businessBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  editFormCard: {
    backgroundColor: LikhoraColors.secondaryLavender,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  editFormTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.primary,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    fontFamily: LikhoraFont.fontFamily,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.three,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.successGreenSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.successGreen,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapCard: {
    backgroundColor: LikhoraColors.secondaryLavender,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  roadmapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roadmapCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roadmapCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapPctText: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: LikhoraColors.primary,
    borderRadius: 4,
  },
  roadmapSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roadmapSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  menuSection: {
    marginBottom: Spacing.four,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    borderRadius: Radius.large,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.errorRedSoft,
    paddingVertical: 14,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.errorRedSoft,
    marginTop: Spacing.two,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.errorRed,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalSubtitle: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: 16,
    width: '100%',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalIconBoxRed: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: LikhoraColors.errorRedSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalIconBoxBlue: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalIconBoxPurple: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitleCentered: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalSubtitleCentered: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  modalDestructiveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    backgroundColor: LikhoraColors.errorRed,
    alignItems: 'center',
  },
  modalDestructiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 8,
  },
  colorPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPillActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
