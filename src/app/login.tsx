import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Check, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { AppLogo } from '@/components/ui/AppLogo';
import { LikhoraColors, Radius, Spacing } from '@/constants/theme';
import { getGoogleSignInErrorMessage, loginWithFirebase, loginWithGoogleFirebase } from '@/services/firebase';
import { syncUserProfile } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const handleLogin = async () => {
    setErrorMsg('');
    setFieldErrors({});
    const errs: { [key: string]: string } = {};
    let hasErr = false;

    if (!email.trim()) {
      errs.email = 'Please enter your email';
      hasErr = true;
    }
    if (!password) {
      errs.password = 'Please enter your password';
      hasErr = true;
    }

    if (hasErr) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await loginWithFirebase(email.trim(), password);
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.warn('Login error:', err);
      let message = 'Failed to log in. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Try again later.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
        await refreshProfile();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.warn('Google sign in note:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(getGoogleSignInErrorMessage(err));
      }
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
          {/* Top-Left Logo & Titles */}
          <View style={styles.titleSection}>
            <AppLogo size={44} showText={false} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Log in to continue your launch journey.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
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
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
              }}
              isPassword
              error={fieldErrors.password}
            />

            {/* Utility Row */}
            <View style={styles.utilityRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxSelected,
                  ]}
                >
                  {rememberMe && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Minimal Warning Capsule Pill */}
            {errorMsg ? (
              <View style={styles.minimalErrorPill}>
                <AlertCircle size={14} color={LikhoraColors.errorRed} style={{ marginRight: 6 }} />
                <Text style={styles.minimalErrorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Primary CTA */}
            <Button
              title="Log In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login - Google Only */}
            <Button
              title="Continue with Google"
              onPress={handleGoogleLogin}
              variant="google"
              icon={<GoogleIcon />}
              loading={loading}
            />

            {/* Bottom Signup Link */}
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    width: '100%',
    marginVertical: Spacing.two,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: LikhoraColors.textSecondary,
  },
  minimalErrorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: LikhoraColors.errorRedSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 6,
  },
  minimalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.errorRed,
  },
  formContainer: {
    width: '100%',
    marginTop: Spacing.two,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rememberText: {
    fontSize: 14,
    color: LikhoraColors.textPrimary,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: LikhoraColors.primary,
    fontWeight: '600',
  },
  loginBtn: {
    marginTop: Spacing.one,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  bottomText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.primary,
  },
});
