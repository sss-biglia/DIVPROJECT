import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CustomTabBar } from '../../components/CustomTabBar';
import { IntroScreen } from '../../components/IntroScreen';
import { ProfileSheet } from '../../components/ProfileSheet';
import { QuickAddSheet } from '../../components/QuickAddSheet';
import { accentColor, darkColors, metallicStyles } from '../../constants/metallicTheme';
import { useApp } from '../../context/AppProvider';
import { getProfileInitials } from '../../utils/profile';
import { ProfileHeaderButton } from '../../components/ProfileHeaderButton';

const INTRO_SEEN_KEY = 'splitsnap_intro_seen';

export default function TabsLayout() {
  const router = useRouter();
  const { groups, profile } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [showNoGroupsModal, setShowNoGroupsModal] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const transitionOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkIntroStatus = async () => {
      try {
        const introSeen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
        if (!introSeen) {
          setShowIntro(true);
          setIntroVisible(true);
        }
      } catch (e) {
        // Silently fail, don't show intro
      }
    };
    void checkIntroStatus();
  }, []);

  const profileButton = (
    <View style={{ marginRight: 18, marginBottom: 4 }}>
      <ProfileHeaderButton
        initials={getProfileInitials(profile)}
        onPress={() => setProfileSheetVisible(true)}
      />
    </View>
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
      AsyncStorage.setItem(INTRO_SEEN_KEY, 'true').catch(console.error);
    });
  };

  return (
    <>
      {/* Main app always rendered underneath */}
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onPressAdd={handleOpenAddExpense}
          />
        )}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: darkColors.background },
          headerTintColor: darkColors.textPrimary,
          headerShadowVisible: false,
          headerRight: () => profileButton,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '',
            headerLeft: () => null,
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
            <Text style={{ fontSize: 40 }}>👥</Text>
            <Text style={metallicStyles.headline}>No tenés ningún grupo</Text>
            <Text style={metallicStyles.subhead}>
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
              <Text style={[metallicStyles.headline, { fontSize: 15, color: darkColors.textPrimary }]}>
                Crear nuevo grupo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNoGroupsModal(false);
              }}
            >
              <Text style={metallicStyles.footnote}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Intro overlay on top, fades out */}
      {introVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: transitionOpacity,
              zIndex: 999,
              backgroundColor: darkColors.background,
            },
          ]}
        >
          <IntroScreen onFinish={handleIntroFinish} />
        </Animated.View>
      )}
    </>
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
    backgroundColor: darkColors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  modalButton: {
    backgroundColor: accentColor,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
});
