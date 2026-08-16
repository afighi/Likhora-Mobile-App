import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Check, ArrowLeft, Mail, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { AppLogo } from '@/components/ui/AppLogo';
import { LikhoraColors, Radius, Spacing } from '@/constants/theme';
import { getGoogleSignInErrorMessage, signUpWithFirebase, loginWithGoogleFirebase } from '@/services/firebase';
import { syncUserProfile } from '@/services/supabase';
import { sendOTPEmail, generateOTPCode } from '@/services/emailjs';
import { useAuth } from '@/context/AuthContext';

export default function SignupScreen() {
  const router = useRouter();
  const { setUserProfile, setOnboardingCompleted } = useAuth();

  // Wizard Step: 1 = Basic Details, 2 = Security & Password, 3 = OTP Verification
  const [step, setStep] = useState(1);

  // Form State (Standard Sign Up: Full Name, Email Address)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // OTP State
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [userOTP, setUserOTP] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Field Errors & Minimal Warning State
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStepChange = (newStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
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
  };

  // Password Requirements Validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // Calculate strength percentage
  const criteriaPassed = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthPercentage = (criteriaPassed / 5) * 100;
  const strengthLabel = 
    criteriaPassed <= 2 ? 'Weak password' : 
    criteriaPassed <= 4 ? 'Medium password' : 'Strong password';

  // Timer effect for OTP resend
  useEffect(() => {
    let interval: any;
    if (step === 3 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleNextStep1 = () => {
    setFieldErrors({});
    setErrorMsg('');
    const errs: { [key: string]: string } = {};
    let hasErr = false;

    if (!fullName.trim()) {
      errs.fullName = 'Please enter your full name';
      hasErr = true;
    }
    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Please enter a valid email address';
      hasErr = true;
    }

    if (hasErr) {
      setFieldErrors(errs);
      return;
    }
    animateStepChange(2);
  };

  const handleNextStep2 = async () => {
    setFieldErrors({});
    setErrorMsg('');
    const errs: { [key: string]: string } = {};
    let hasErr = false;

    if (!isPasswordValid) {
      errs.password = 'Password does not meet requirements';
      hasErr = true;
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
      hasErr = true;
    }
    if (!agreeTerms) {
      setErrorMsg('Please agree to the Terms & Privacy Policy');
      hasErr = true;
    }

    if (hasErr) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const otp = generateOTPCode();
    setGeneratedOTP(otp);

    const emailResult = await sendOTPEmail(email.trim(), otp, fullName.trim());
    setLoading(false);

    if (emailResult.success) {
      animateStepChange(3);
      setResendTimer(60);
      setCanResend(false);
    } else {
      setErrorMsg('Failed to send code. Please try again');
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setLoading(true);
    const otp = generateOTPCode();
    setGeneratedOTP(otp);

    await sendOTPEmail(email.trim(), otp, fullName.trim());
    setLoading(false);
    setResendTimer(60);
    setCanResend(false);
    Alert.alert('Code Sent', `A new 6-digit OTP code has been sent to ${email}`);
  };

  const handleVerifyAndRegister = async () => {
    setFieldErrors({});
    setErrorMsg('');
    if (!userOTP.trim() || userOTP.trim().length < 6) {
      setFieldErrors({ otp: 'Enter 6-digit code' });
      return;
    }

    if (userOTP.trim() !== generatedOTP) {
      setFieldErrors({ otp: 'Invalid verification code' });
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth User
      const userCredential = await signUpWithFirebase(email.trim(), password);
      const firebaseUser = userCredential.user;

      // 2. Create User Profile in Supabase
      const newProfile = {
        id: firebaseUser.uid,
        email: email.trim(),
        full_name: fullName.trim(),
        onboarded: false,
      };

      await syncUserProfile(newProfile);
      setUserProfile(newProfile);
      setOnboardingCompleted(false);

      // 3. Navigate to Onboarding questionnaire
      router.replace('/onboarding');
    } catch (err: any) {
      console.warn('Registration error:', err);
      let msg = 'Failed to create account. Please try again';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Account with this email already exists';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Back Button & Brand */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step > 1) animateStepChange(step - 1);
                else if (router.canGoBack()) router.back();
                else router.replace('/login');
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={LikhoraColors.textPrimary} />
            </TouchableOpacity>

            <AppLogo size={30} />

            <View style={{ width: 40 }} />
          </View>

          {/* Modern Segmented Pill Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.segmentedRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.segmentPill,
                    step >= s && styles.segmentPillActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Animated Form Container */}
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            {/* STEP 1: Standard Basic Information */}
            {step === 1 && (
              <View>
                <View style={styles.headerSection}>
                  <Text style={styles.title}>Create your account</Text>
                  <Text style={styles.subtitle}>
                    Join thousands of entrepreneurs building smarter businesses.
                  </Text>
                </View>

                <Input
                  label="Full Name"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChangeText={(txt) => {
                    setFullName(txt);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' });
                  }}
                  autoCapitalize="words"
                  error={fieldErrors.fullName}
                />

                <Input
                  label="Email Address"
                  placeholder="juan@negosyo.ph"
                  value={email}
                  onChangeText={(txt) => {
                    setEmail(txt);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={fieldErrors.email}
                />

                {/* Minimal Warning Pill if general error exists */}
                {errorMsg ? (
                  <View style={styles.minimalErrorPill}>
                    <AlertCircle size={14} color={LikhoraColors.errorRed} style={{ marginRight: 6 }} />
                    <Text style={styles.minimalErrorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Button
                  title="Continue"
                  onPress={handleNextStep1}
                  style={styles.actionBtn}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Button
                  title="Continue with Google"
                  onPress={async () => {
                    setErrorMsg('');
                    setLoading(true);
                    try {
                      const userCred = await loginWithGoogleFirebase();
                      if (userCred.user) {
                        await syncUserProfile({
                          id: userCred.user.uid,
                          email: userCred.user.email || '',
                          full_name: userCred.user.displayName || 'Entrepreneur',
                          onboarded: false,
                        });
                        setUserProfile({
                          id: userCred.user.uid,
                          email: userCred.user.email || '',
                          full_name: userCred.user.displayName || 'Entrepreneur',
                          onboarded: false,
                        });
                        setOnboardingCompleted(false);
                        router.replace('/onboarding');
                      }
                    } catch (err: any) {
                      console.warn('Google sign up note:', err);
                      if (err.code !== 'auth/popup-closed-by-user') {
                        setErrorMsg(getGoogleSignInErrorMessage(err));
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                  variant="google"
                  icon={<GoogleIcon />}
                  loading={loading}
                />
              </View>
            )}

            {/* STEP 2: Security & Password Checklist */}
            {step === 2 && (
              <View>
                <View style={styles.headerSection}>
                  <Text style={styles.title}>Create a strong password</Text>
                  <Text style={styles.subtitle}>
                    Ensure your account is protected with a secure password.
                  </Text>
                </View>

                <Input
                  label="Password"
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={(txt) => {
                    setPassword(txt);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  isPassword
                  error={fieldErrors.password}
                />

                {/* Password Strength Live Checklist Box */}
                <View style={styles.strengthBox}>
                  <View style={styles.strengthHeader}>
                    <Text style={styles.strengthTitle}>Password strength</Text>
                    <Text
                      style={[
                        styles.strengthStatus,
                        criteriaPassed >= 4 && { color: LikhoraColors.successGreen },
                      ]}
                    >
                      {strengthLabel}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${strengthPercentage}%`,
                          backgroundColor:
                            criteriaPassed <= 2
                              ? LikhoraColors.errorRed
                              : criteriaPassed <= 4
                              ? LikhoraColors.highlightYellow
                              : LikhoraColors.successGreen,
                        },
                      ]}
                    />
                  </View>

                  {/* Checklist Items */}
                  <View style={styles.checklist}>
                    <RequirementItem label="At least 8 characters" met={hasMinLength} />
                    <RequirementItem label="One uppercase letter" met={hasUppercase} />
                    <RequirementItem label="One lowercase letter" met={hasLowercase} />
                    <RequirementItem label="One number" met={hasNumber} />
                    <RequirementItem label="One special character" met={hasSpecial} />
                  </View>
                </View>

                <Input
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={(txt) => {
                    setConfirmPassword(txt);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  isPassword
                  error={
                    fieldErrors.confirmPassword ||
                    (confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined)
                  }
                />

                {/* Terms Checkbox */}
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => {
                    setAgreeTerms(!agreeTerms);
                    if (errorMsg) setErrorMsg('');
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      agreeTerms && styles.checkboxSelected,
                    ]}
                  >
                    {agreeTerms && (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink}>Terms</Text> &{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>.
                  </Text>
                </TouchableOpacity>

                {/* Minimal Warning Pill */}
                {errorMsg ? (
                  <View style={styles.minimalErrorPill}>
                    <AlertCircle size={14} color={LikhoraColors.errorRed} style={{ marginRight: 6 }} />
                    <Text style={styles.minimalErrorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Button
                  title="Send Verification Code"
                  onPress={handleNextStep2}
                  loading={loading}
                  style={styles.actionBtn}
                />
              </View>
            )}

            {/* STEP 3: OTP Verification */}
            {step === 3 && (
              <View>
                <View style={styles.otpHeaderBox}>
                  <View style={styles.otpIconCircle}>
                    <Mail size={32} color={LikhoraColors.primary} />
                  </View>
                  <Text style={styles.title}>Verify your email</Text>
                  <Text style={styles.otpSubtitle}>
                    We sent a 6-digit OTP code to{' '}
                    <Text style={{ fontWeight: '700', color: LikhoraColors.textPrimary }}>
                      {email}
                    </Text>
                  </Text>
                </View>

                <Input
                  label="6-Digit OTP Code"
                  placeholder="123456"
                  value={userOTP}
                  onChangeText={(txt) => {
                    setUserOTP(txt);
                    if (fieldErrors.otp) setFieldErrors({ ...fieldErrors, otp: '' });
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={fieldErrors.otp}
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '700' }}
                />

                {/* Minimal Warning Pill */}
                {errorMsg ? (
                  <View style={styles.minimalErrorPill}>
                    <AlertCircle size={14} color={LikhoraColors.errorRed} style={{ marginRight: 6 }} />
                    <Text style={styles.minimalErrorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Button
                  title="Verify & Create Account"
                  onPress={handleVerifyAndRegister}
                  loading={loading}
                  style={styles.actionBtn}
                />

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={!canResend}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        !canResend && { color: LikhoraColors.textPlaceholder },
                      ]}
                    >
                      {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Bottom Login Row */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const RequirementItem: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
  <View style={styles.reqRow}>
    <View
      style={[
        styles.reqBadge,
        met && { backgroundColor: LikhoraColors.successGreen },
      ]}
    >
      <Check size={10} color={met ? '#FFFFFF' : LikhoraColors.textPlaceholder} strokeWidth={3} />
    </View>
    <Text
      style={[
        styles.reqLabel,
        met && { color: LikhoraColors.successGreen, fontWeight: '600' },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginVertical: Spacing.three,
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentPill: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E9D5FF',
  },
  segmentPillActive: {
    backgroundColor: LikhoraColors.primary,
  },
  headerSection: {
    marginVertical: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    marginBottom: Spacing.two,
  },
  minimalErrorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: LikhoraColors.errorRedSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 4,
  },
  minimalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.errorRed,
  },
  formContainer: {
    width: '100%',
    marginTop: Spacing.one,
  },
  actionBtn: {
    marginTop: Spacing.two,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LikhoraColors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
  },
  strengthBox: {
    backgroundColor: LikhoraColors.secondaryLavender,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginVertical: Spacing.two,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  strengthTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
  },
  strengthStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: '#E9D5FF',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklist: {
    gap: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reqLabel: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: LikhoraColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  termsText: {
    fontSize: 13,
    color: LikhoraColors.textPrimary,
  },
  termsLink: {
    color: LikhoraColors.primary,
    fontWeight: '700',
  },
  otpHeaderBox: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LikhoraColors.secondaryLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  otpSubtitle: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  resendText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  bottomText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
  },
});
