import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import * as Haptics from 'expo-haptics';
=======
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppCard, Field, PrimaryButton, SectionTitle } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { UserProfile } from '../../types';
import { createId } from '../../utils/id';

const avatarColors = [
  '#7C5CFC',
  '#4ADE80',
  '#F87171',
  '#FB923C',
  '#60A5FA',
  '#E879F9',
];

const getInitials = (name: string, lastName: string) =>
  `${name.trim().charAt(0)}${lastName.trim().charAt(0)}`.trim().toUpperCase() || '?';

export default function ProfileScreen() {
  const { profile, saveUserProfile } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [mpAlias, setMpAlias] = useState(profile?.mpAlias ?? '');
  const [mpPaymentLink, setMpPaymentLink] = useState(profile?.mpPaymentLink ?? '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatarColor ?? theme.colors.accent);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    const nextProfile: UserProfile = {
      id: profile?.id ?? createId(),
      name: name.trim(),
      lastName: lastName.trim(),
      avatarColor,
      mpAlias: mpAlias.trim(),
      mpPaymentLink: mpPaymentLink.trim(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };

    try {
      setLoading(true);
<<<<<<< HEAD
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
=======
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
      await saveUserProfile(nextProfile);
      setSaveMessage('Profile saved ✓');
      setTimeout(() => setSaveMessage(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle
          title="Profile"
          subtitle="Set how people recognize you and where they can pay you back."
        />

        <View style={styles.avatarSection}>
          <Pressable
<<<<<<< HEAD
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowColorPicker((current) => !current);
            }}
=======
            onPress={() => setShowColorPicker((current) => !current)}
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
            style={[styles.avatar, { backgroundColor: avatarColor }]}
          >
            <Text style={styles.avatarLabel}>{getInitials(name, lastName)}</Text>
          </Pressable>

          {showColorPicker ? (
            <View style={styles.colorRow}>
              {avatarColors.map((color) => (
                <Pressable
                  key={color}
<<<<<<< HEAD
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAvatarColor(color);
                  }}
=======
                  onPress={() => setAvatarColor(color)}
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    avatarColor === color && styles.colorSwatchSelected,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <AppCard>
          <Field
            autoCorrect={false}
            label="Name"
            onChangeText={setName}
            placeholder="Name"
            value={name}
          />
          <Field
            autoCorrect={false}
            label="Last name"
            onChangeText={setLastName}
            placeholder="Last name"
            value={lastName}
          />
          <View style={styles.divider} />
          <View style={styles.mpHeader}>
            <Ionicons color={theme.colors.textPrimary} name="wallet-outline" size={18} />
            <Text style={styles.mpTitle}>MercadoPago</Text>
          </View>
          <Field
            autoCorrect={false}
            label="MercadoPago Alias"
            onChangeText={setMpAlias}
            placeholder="Your MercadoPago alias"
            value={mpAlias}
          />
          <Field
            autoCorrect={false}
            label="Payment Link"
            onChangeText={setMpPaymentLink}
            placeholder="https://mpago.la/..."
            value={mpPaymentLink}
          />
          <Text style={styles.helperText}>
            Your friends will pay you directly through this link
          </Text>
        </AppCard>

        <PrimaryButton
          label="Save Profile"
          loading={loading}
          onPress={() => void onSave()}
          disabled={!name.trim()}
        />
        {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  colorSwatch: {
    height: 28,
    width: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  mpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mpTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  successText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
