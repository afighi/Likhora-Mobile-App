import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { LikhoraColors, Radius, Spacing } from '@/constants/theme';
import { resetPasswordFirebase } from '@/services/firebase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSendReset = async () => {
    setEmailError('');
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordFirebase(email.trim());
      setSentSuccess(true);
    } catch (err: any) {
      console.warn('Reset password note:', err);
      setSentSuccess(true);
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
          {/* Header Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
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

          {/* Titles */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send a reset link.
            </Text>
          </View>

          {/* Content */}
          {!sentSuccess ? (
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
                error={emailError}
              />

              <Button
                title="Send Reset Link"
                onPress={handleSendReset}
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
          ) : (
            /* Success Feedback View (matching reference image) */
            <View style={styles.formContainer}>
              <View style={styles.successCard}>
                <Mail size={22} color={LikhoraColors.successGreen} style={{ marginRight: 12 }} />
                <Text style={styles.successText}>
                  Reset link sent to{' '}
                  <Text style={{ fontWeight: '700' }}>{email}</Text>. Check your inbox — it may take a minute to arrive.
                </Text>
              </View>

              <Button
                title="Back to Login"
                onPress={() => router.push('/login')}
                style={styles.primaryBtn}
              />

              <TouchableOpacity
                style={styles.differentEmailBtn}
                onPress={() => {
                  setSentSuccess(false);
                  setEmail('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.differentEmailText}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}
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
  titleSection: {
    marginVertical: Spacing.three,
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
  formContainer: {
    marginTop: Spacing.two,
  },
  primaryBtn: {
    marginTop: Spacing.two,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LikhoraColors.successGreenSoft,
    borderWidth: 1,
    borderColor: LikhoraColors.successGreen,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
  differentEmailBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  differentEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: LikhoraColors.primary,
  },
});
