import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LikhoraColors } from '@/constants/theme';

// Screens reachable without a completed (or any) account.
const PUBLIC_ROUTES = ['login', 'signup', 'forgot-password'];

/**
 * Enforces the app's real entry order everywhere, not just from the widgets
 * that happen to link into it: an authenticated user who hasn't finished
 * onboarding is redirected to it before they can reach any other screen
 * (home, suppliers, a deep link, a resumed session, etc.), and a completed
 * user is kept out of the auth screens once logged in.
 */
function RootNavigationGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, onboardingCompleted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0] || '';
    const onPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

    if (!user) {
      if (!onPublicRoute) router.replace('/login');
      return;
    }

    if (!onboardingCompleted) {
      if (currentRoute !== 'onboarding') router.replace('/onboarding');
      return;
    }

    // Once onboarded, keep the user out of the auth screens — but leave
    // `/onboarding` itself alone: profile.tsx's "Retake Business Setup"
    // intentionally sends already-onboarded users back there.
    if (onPublicRoute) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, onboardingCompleted, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'montserrat-google-font';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <RootNavigationGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: LikhoraColors.backgroundScreen },
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animationDuration: 250,
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="template-builder" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="my-templates" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          </Stack>
        </RootNavigationGate>
      </NotificationProvider>
    </AuthProvider>
  );
}
