import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

import { Field, PrimaryButton, SectionTitle } from '../../components/ui';
import { MetallicCard } from '../../components/metallic/MetallicCard';
import { darkColors, metallicStyles } from '../../constants/metallicTheme';
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
  const [avatarColor, setAvatarColor] = useState(profile?.avatarColor ?? metallicStyles.accentCard.borderColor);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveUserProfile(nextProfile);
      setSaveMessage('Perfil guardado ✓');
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
          title="Perfil"
          subtitle="Configurá cómo te ven tus amigos y cómo pueden devolverte plata."
        />

        <View style={styles.avatarSection}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowColorPicker((current) => !current);
            }}
            style={[styles.avatar, { backgroundColor: avatarColor }]}
          >
            <Text style={metallicStyles.title1}>{getInitials(name, lastName)}</Text>
          </Pressable>

          {showColorPicker ? (
            <View style={styles.colorRow}>
              {avatarColors.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAvatarColor(color);
                  }}
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

        <MetallicCard>
          <Field
            autoCorrect={false}
            label="Nombre"
            onChangeText={setName}
            placeholder="Nombre"
            value={name}
          />
          <Field
            autoCorrect={false}
            label="Apellido"
            onChangeText={setLastName}
            placeholder="Apellido"
            value={lastName}
          />
          <View style={styles.divider} />
          <View style={styles.mpHeader}>
            <Ionicons color={darkColors.textPrimary} name="wallet-outline" size={18} />
            <Text style={metallicStyles.headline}>MercadoPago</Text>
          </View>
          <Field
            autoCorrect={false}
            label="Alias de MercadoPago"
            onChangeText={setMpAlias}
            placeholder="Tu alias de MercadoPago"
            value={mpAlias}
          />
          <Field
            autoCorrect={false}
            label="Link de pago"
            onChangeText={setMpPaymentLink}
            placeholder="https://mpago.la/..."
            value={mpPaymentLink}
          />
          <Text style={metallicStyles.footnote}>
            Tus amigos te van a pagar directamente con este link.
          </Text>
        </MetallicCard>

        <PrimaryButton
          label="Guardar Perfil"
          loading={loading}
          onPress={() => void onSave()}
          disabled={!name.trim()}
        />
        {saveMessage ? <Text style={[metallicStyles.callout, { textAlign: 'center', fontWeight: '600' }]}>{saveMessage}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorSwatch: {
    height: 28,
    width: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: darkColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: darkColors.borderDefault,
  },
  mpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
