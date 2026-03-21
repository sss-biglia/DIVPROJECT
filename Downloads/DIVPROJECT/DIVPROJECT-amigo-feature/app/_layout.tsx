import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileHeaderButton } from '../components/ProfileHeaderButton';
import { ProfileSheet } from '../components/ProfileSheet';
import { theme } from '../constants/theme';
import { AppProvider, useApp } from '../context/AppProvider';
import { auth } from '../services/firebase';
import { isOnboardingDone } from '../services/profileService';
import { getProfileInitials } from '../utils/profile';

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, profile } = useApp();
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isReady || !authReady) {
      setNavigationReady(false);
      return;
    }

    let isMounted = true;

    const syncNavigation = async () => {
      const onboardingDone = await isOnboardingDone();

      if (!isMounted) {
        return;
      }

      if (!authUser) {
        if (pathname !== '/login') {
          router.replace('/login');
          return;
        }

        setNavigationReady(true);
        return;
      }

      if (!onboardingDone) {
        if (pathname !== '/onboarding') {
          router.replace('/onboarding');
          return;
        }

        setNavigationReady(true);
        return;
      }

      if (pathname === '/login' || pathname === '/onboarding') {
        router.replace('/(tabs)');
        return;
      }

      setNavigationReady(true);
    };

    void syncNavigation();

    return () => {
      isMounted = false;
    };
  }, [authReady, authUser, isReady, pathname, router]);

  if (!navigationReady) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackVisible: true,
          headerTintColor: theme.colors.textPrimary,
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerBackTitle: 'Volver',
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
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="group/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="group/create"
          options={{
            title: '',
            headerShown: true,
            animation: 'slide_from_right',
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#F5F5F0',
            headerShadowVisible: false,
            headerBackTitle: 'Volver',
            headerRight: () => null,
          }}
        />
        <Stack.Screen
          name="expense/add"
          options={{
            title: '',
            headerShown: true,
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#F5F5F0',
            headerShadowVisible: false,
            headerBackTitle: 'Volver',
            headerRight: () => null,
          }}
        />
        <Stack.Screen
          name="expense/confirm"
          options={{
            title: 'Confirmar gasto',
            headerShown: true,
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#F5F5F0',
            headerShadowVisible: false,
            headerBackTitle: 'Volver',
          }}
        />
        <Stack.Screen
          name="expense/edit"
          options={{
            title: 'Editar gasto',
            headerShown: true,
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#F5F5F0',
            headerShadowVisible: false,
            headerBackTitle: 'Volver',
          }}
        />
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
