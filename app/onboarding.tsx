import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppCard, Field, PrimaryButton } from '../components/ui';
import { theme } from '../constants/theme';
import { useApp } from '../context/AppProvider';
import { markOnboardingDone } from '../services/profileService';
import { UserProfile } from '../types';
import { createId } from '../utils/id';

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveUserProfile } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mpAlias, setMpAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const lastNameRef = useRef<TextInput | null>(null);
  const aliasRef = useRef<TextInput | null>(null);

  const onFinish = async () => {
    if (!name.trim()) {
      return;
    }

    const profile: UserProfile = {
      id: createId(),
      name: name.trim(),
      lastName: lastName.trim(),
      avatarColor: theme.colors.accent,
      mpAlias: mpAlias.trim(),
      mpPaymentLink: '',
      createdAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      await saveUserProfile(profile);
      await markOnboardingDone();
      router.replace('/(tabs)');
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
        {step === 1 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.heroEmoji}>💸</Text>
            <Text style={styles.title}>Welcome to SplitSnap</Text>
            <Text style={styles.subtitle}>
              Split expenses with friends, scan receipts and settle up instantly.
            </Text>
            <PrimaryButton label="Get Started" onPress={() => setStep(2)} />
          </View>
        ) : (
          <View style={styles.stepWrap}>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Set up your profile</Text>
              <Text style={styles.subtitle}>This is how your friends will identify you</Text>
            </View>

            <AppCard>
              <Field
                autoCorrect={false}
                autoFocus
                label="Name"
                onChangeText={setName}
                placeholder="Name"
                returnKeyType="next"
                value={name}
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
              <Field
                ref={lastNameRef}
                autoCorrect={false}
                label="Last name"
                onChangeText={setLastName}
                placeholder="Last name"
                returnKeyType="next"
                value={lastName}
                onSubmitEditing={() => aliasRef.current?.focus()}
              />
              <Field
                ref={aliasRef}
                autoCorrect={false}
                label="MercadoPago alias"
                onChangeText={setMpAlias}
                placeholder="Your MercadoPago alias"
                returnKeyType="done"
                value={mpAlias}
                onSubmitEditing={() => void onFinish()}
              />
              <Text style={styles.helperText}>Your friends will use this to pay you back</Text>
            </AppCard>

            <PrimaryButton
              label="Start using SplitSnap"
              loading={loading}
              onPress={() => void onFinish()}
              disabled={!name.trim()}
            />
          </View>
        )}
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
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
  },
  stepWrap: {
    gap: theme.spacing.lg,
  },
  headerBlock: {
    gap: theme.spacing.xs,
  },
  heroEmoji: {
    textAlign: 'center',
    fontSize: 74,
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
