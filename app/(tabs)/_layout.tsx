import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomTabBar } from '../../components/CustomTabBar';
import { IntroScreen } from '../../components/IntroScreen';
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
  const [showNoGroupsModal, setShowNoGroupsModal] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introVisible, setIntroVisible] = useState(true);
  const transitionOpacity = useRef(new Animated.Value(1)).current;

  const profileButton = (
    <View style={{ marginRight: 18, marginBottom: 4 }}>
      <ProfileHeaderButton
        initials={getProfileInitials(profile)}
        onPress={() => setProfileSheetVisible(true)}
      />
    </View>
  );

  const createGroupButton = (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/group/create');
      }}
      style={{ marginLeft: 16 }}
    >
      <Ionicons color={theme.colors.textPrimary} name="add" size={24} />
    </Pressable>
  );

  const handleOpenAddExpense = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!groups || groups.length === 0) {
      setShowNoGroupsModal(true);
    } else {
      setSheetVisible(true);
    }
  };

  const handleIntroFinish = () => {
    // Fade out the entire intro overlay over 0.3 seconds
    Animated.timing(transitionOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIntroVisible(false); // fully remove intro after fade
      setShowIntro(false);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Main app always rendered underneath */}
      <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onPressAdd={handleOpenAddExpense}
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
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      <Modal
        visible={showNoGroupsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoGroupsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalEmoji}>👥</Text>
            <Text style={styles.modalTitle}>No tenés ningún grupo</Text>
            <Text style={styles.modalMessage}>
              Para registrar un gasto primero necesitás crear un grupo.
            </Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNoGroupsModal(false);
                router.push('/group/create');
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonLabel}>Crear nuevo grupo</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNoGroupsModal(false);
              }}
            >
              <Text style={styles.modalCancel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </>

      {/* Intro overlay on top, fades out */}
      {introVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: transitionOpacity,
              zIndex: 999,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <IntroScreen onFinish={handleIntroFinish} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonLabel: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  modalCancel: { color: theme.colors.textSecondary, fontSize: 13 },
});
