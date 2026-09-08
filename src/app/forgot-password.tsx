import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { OtpInput } from '@/components/ui/OtpInput';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { requestPasswordResetCode, confirmPasswordReset } from '@/services/passwordReset';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Reset happens entirely in the app: email -> emailed code -> new password.
 *
 * The code is generated and verified by the "password-reset" Edge Function,
 * never here. A client-side check would be trivially bypassed, and unlike the
 * signup OTP the prize for bypassing it is someone else's account.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [notice, setNotice] = useState('');

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (isResend = false) => {
    setEmailError('');
    setNotice('');

    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await requestPasswordResetCode(email);
    setLoading(false);

    if (!result.ok) {
      setEmailError(result.message);
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep(2);
    if (isResend) setNotice('A new code is on its way.');
  };

  const submitNewPassword = async () => {
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);
    // The code is checked in the same call that sets the password, so a
    // verified code is never left sitting around on the client.
    const result = await confirmPasswordReset(email, code, password);
    setLoading(false);

    if (!result.ok) {
      // A bad or expired code is reported against the code, not the password,
      // so the user lands back on the field that actually needs fixing.
      if (/code/i.test(result.message)) {
        setCodeError(result.message);
        setStep(2);
        return;
      }
      setPasswordError(result.message);
      return;
    }

    setStep(4);
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
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  return;
                }
                if (step === 3) {
                  setStep(2);
                  return;
                }
                if (router.canGoBack()) router.back();
                else router.replace('/login');
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
            </TouchableOpacity>

            <AppLogo size={30} />

            <View style={{ width: 40 }} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Enter your code'}
              {step === 3 && 'Set a new password'}
              {step === 4 && 'Password updated'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 && "Enter your email and we'll send you a 6-digit code."}
              {step === 2 && `We sent a code to ${email}. It expires in 10 minutes.`}
              {step === 3 && 'Choose a password you have not used here before.'}
              {step === 4 && 'You can now sign in with your new password.'}
            </Text>
          </View>

          {/* ------------------------------- STEP 1: email ------------------------------ */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <Input
                label="Email Address"
                placeholder="juan@negosyo.ph"
                value={email}
                onChangeText={(txt) => {
                  setEmail(txt);
                  if (emailError) setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                error={emailError}
              />

              <Button
                title="Send Code"
                onPress={() => sendCode()}
                loading={loading}
                style={styles.primaryBtn}
              />

              <Button
                title="Back to Login"
                onPress={() => router.push('/login')}
                variant="outline"
                style={{ marginTop: 10 }}
              />
            </View>
          )}

          {/* -------------------------------- STEP 2: code ------------------------------ */}
          {step === 2 && (
            <View style={styles.formContainer}>
              {notice ? (
                <View style={styles.noticeCard}>
                  <Mail size={16} color={LikhoraColors.successGreen} style={{ marginRight: 8 }} />
                  <Text style={styles.noticeText}>{notice}</Text>
                </View>
              ) : null}

              <OtpInput
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (codeError) setCodeError('');
                }}
                error={codeError}
              />

              <Button
                title="Continue"
                onPress={() => {
                  if (code.length < 6) {
                    setCodeError('Enter the 6-digit code');
                    return;
                  }
                  setStep(3);
                }}
                style={styles.primaryBtn}
              />

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => sendCode(true)}
                disabled={cooldown > 0 || loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ---------------------------- STEP 3: new password -------------------------- */}
          {step === 3 && (
            <View style={styles.formContainer}>
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={(txt) => {
                  setPassword(txt);
                  if (passwordError) setPasswordError('');
                }}
                isPassword
                autoCapitalize="none"
                textContentType="newPassword"
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(txt) => {
                  setConfirmPassword(txt);
                  if (passwordError) setPasswordError('');
                }}
                isPassword
                autoCapitalize="none"
                textContentType="newPassword"
                error={passwordError}
              />

              <Button
                title="Update Password"
                onPress={submitNewPassword}
                loading={loading}
                style={styles.primaryBtn}
              />
            </View>
          )}

          {/* -------------------------------- STEP 4: done ------------------------------ */}
          {step === 4 && (
            <View style={styles.formContainer}>
              <View style={styles.successCard}>
                <CheckCircle2 size={22} color={LikhoraColors.successGreen} style={{ marginRight: 12 }} />
                <Text style={styles.successText}>
                  Your password has been updated. Sign in with your new password.
                </Text>
              </View>

              <Button
                title="Back to Login"
                onPress={() => router.replace('/login')}
                style={styles.primaryBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen },
  container: { flex: 1 },
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
  titleSection: { marginVertical: Spacing.three },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  subtitle: {
    fontSize: 15,
    color: LikhoraColors.textSecondary,
    lineHeight: 21,
    fontFamily: LikhoraFont.fontFamily,
  },
  formContainer: { marginTop: Spacing.two },
  primaryBtn: { marginTop: Spacing.four },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.successGreenSoft,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  resendBtn: { alignItems: 'center', paddingVertical: 16 },
  resendText: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  resendTextDisabled: { color: LikhoraColors.textPlaceholder },
  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LikhoraColors.successGreenSoft,
    borderWidth: 1,
    borderColor: LikhoraColors.successGreen,
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
});
