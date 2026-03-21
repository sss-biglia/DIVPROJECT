import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';

import { accentColor, darkColors, metallicStyles } from '../constants/metallicTheme';
import { useApp } from '../context/AppProvider';
import { auth } from '../services/firebase';
import { getProfileDisplayName, getProfileInitials } from '../utils/profile';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const router = useRouter();
  const { profile, dolarRate } = useApp();
  const translateY = useRef(new Animated.Value(520)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = async () => {
    try {
      onClose();
      await signOut(auth);
      router.replace('/login');
    } catch {
      Alert.alert('No pudimos cerrar sesión', 'Probá de nuevo.');
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : 520,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY, visible]);

  const rows = [
    {
      icon: 'person-outline' as const,
      label: 'Mi cuenta',
      onPress: () => {
        onClose();
        router.push('/(tabs)/profile');
      },
      value: undefined,
    },
    {
      icon: 'settings-outline' as const,
      label: 'Configuración',
      onPress: () => {
        onClose();
        router.push('/settings');
      },
      value: undefined,
    },
    {
      icon: 'swap-horizontal-outline' as const,
      label: 'Tipo de cambio',
      onPress: () => undefined,
      value: dolarRate ? `$${Math.round(dolarRate.venta)}` : '—',
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={metallicStyles.title2}>{getProfileInitials(profile)}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={metallicStyles.title2}>{getProfileDisplayName(profile) || 'SplitSnap'}</Text>
              <Text style={metallicStyles.footnote}>{profile?.mpAlias || 'Tu alias de cobro aparece acá'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={darkColors.textPrimary} name="close" size={20} />
            </Pressable>
          </View>

          <View style={styles.list}>
            {rows.map((row) => (
              <Pressable key={row.label} onPress={row.onPress} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons color={darkColors.textPrimary} name={row.icon} size={18} />
                  <Text style={metallicStyles.callout}>{row.label}</Text>
                </View>
                <View style={styles.rowRight}>
                  {row.value ? <Text style={metallicStyles.footnote}>{row.value}</Text> : null}
                  <Ionicons color={darkColors.textSecondary} name="chevron-forward" size={18} />
                </View>
              </Pressable>
            ))}

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons color={darkColors.textPrimary} name="notifications-outline" size={18} />
                <Text style={metallicStyles.callout}>Notificaciones</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={darkColors.textPrimary}
                trackColor={{
                  false: darkColors.cardSecondary,
                  true: accentColor,
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable onPress={() => void handleSignOut()} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons color={darkColors.textPrimary} name="log-out-outline" size={18} />
              <Text style={metallicStyles.callout}>Cerrar sesión</Text>
            </View>
            <Ionicons color={darkColors.textSecondary} name="chevron-forward" size={18} />
          </Pressable>

          <Pressable onPress={onClose} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons color={darkColors.textPrimary} name="information-circle-outline" size={18} />
              <Text style={metallicStyles.callout}>Acerca de SplitSnap</Text>
            </View>
            <Ionicons color={darkColors.textSecondary} name="chevron-forward" size={18} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: darkColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: darkColors.cardSecondary,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.card,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
  },
  list: {
    gap: 12,
  },
  row: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: darkColors.card,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
