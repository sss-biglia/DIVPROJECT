import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileHeaderButton } from '../components/ProfileHeaderButton';
import { ProfileSheet } from '../components/ProfileSheet';
import { theme } from '../constants/theme';
import { AppProvider, useApp } from '../context/AppProvider';
import { isOnboardingDone } from '../services/profileService';
import { getProfileInitials } from '../utils/profile';

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, profile } = useApp();
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isReady) {
        return;
      }

      const onboardingDone = await isOnboardingDone();

      if (!onboardingDone && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    };

    void checkOnboarding();
  }, [isReady, pathname, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackVisible: true,
          headerTintColor: theme.colors.textPrimary,
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
          headerRight: () => (
            <ProfileHeaderButton
              initials={getProfileInitials(profile)}
              onPress={() => setProfileSheetVisible(true)}
            />
          ),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="group/create" options={{ headerShown: false }} />
        <Stack.Screen name="expense/scan" options={{ headerShown: false }} />
        <Stack.Screen name="receipt-viewer" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Configuración' }} />
      </Stack>

      <ProfileSheet visible={profileSheetVisible} onClose={() => setProfileSheetVisible(false)} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
