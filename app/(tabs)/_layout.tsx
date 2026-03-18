import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { CustomTabBar } from '../../components/CustomTabBar';
import { ProfileSheet } from '../../components/ProfileSheet';
import { QuickAddSheet } from '../../components/QuickAddSheet';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { getProfileInitials } from '../../utils/profile';
import { ProfileHeaderButton } from '../../components/ProfileHeaderButton';

export default function TabsLayout() {
  const router = useRouter();
  const { groups, profile } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);

  const profileButton = (
    <ProfileHeaderButton
      initials={getProfileInitials(profile)}
      onPress={() => setProfileSheetVisible(true)}
    />
  );

  const createGroupButton = (
    <Pressable onPress={() => router.push('/group/create')} style={{ marginLeft: 8 }}>
      <Ionicons color={theme.colors.textPrimary} name="add" size={24} />
    </Pressable>
  );

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onPressAdd={() => setSheetVisible(true)}
          />
        )}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          headerRight: () => profileButton,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Grupos',
            headerLeft: () => createGroupButton,
          }}
        />
        <Tabs.Screen
          name="balances"
          options={{
            title: 'Saldos',
            headerLeft: () => null,
          }}
        />
        <Tabs.Screen name="quick-add" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>

      <QuickAddSheet
        visible={sheetVisible}
        groups={groups}
        onClose={() => setSheetVisible(false)}
        onSelectAction={(groupId, action) => {
          setSheetVisible(false);
          router.push(
            action === 'scan'
              ? `/expense/scan?groupId=${groupId}`
              : `/expense/add?groupId=${groupId}`
          );
        }}
      />

      <ProfileSheet
        visible={profileSheetVisible}
        onClose={() => setProfileSheetVisible(false)}
      />
    </>
  );
}
