import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { theme } from '../constants/theme';
import { useApp } from '../context/AppProvider';
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
              <Text style={styles.avatarLabel}>{getProfileInitials(profile)}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.name}>{getProfileDisplayName(profile) || 'SplitSnap'}</Text>
              <Text style={styles.alias}>{profile?.mpAlias || 'Tu alias de cobro aparece acá'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={theme.colors.textPrimary} name="close" size={20} />
            </Pressable>
          </View>

          <View style={styles.list}>
            {rows.map((row) => (
              <Pressable key={row.label} onPress={row.onPress} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons color={theme.colors.textPrimary} name={row.icon} size={18} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                <View style={styles.rowRight}>
                  {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                  <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
                </View>
              </Pressable>
            ))}

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons color={theme.colors.textPrimary} name="notifications-outline" size={18} />
                <Text style={styles.rowLabel}>Notificaciones</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={theme.colors.textPrimary}
                trackColor={{
                  false: theme.colors.cardSecondary,
                  true: theme.colors.accentDim,
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable onPress={onClose} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons color={theme.colors.textPrimary} name="information-circle-outline" size={18} />
              <Text style={styles.rowLabel}>Acerca de SplitSnap</Text>
            </View>
            <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.colors.textPrimary,
    ...theme.typography.title3,
  },
  alias: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  list: {
    gap: theme.spacing.sm,
  },
  row: {
    minHeight: 56,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
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
  rowLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
  },
  rowValue: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
