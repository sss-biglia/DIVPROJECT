import { useRouter } from 'expo-router';
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
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { AppCard, Field, PrimaryButton } from '../components/ui';
import { theme } from '../constants/theme';
import { auth } from '../services/firebase';
import { isOnboardingDone } from '../services/profileService';

const getAuthErrorMessage = (error: unknown) => {
  const code =
    typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'El email ya está en uso';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return 'Email o contraseña incorrectos';
    default:
      return 'No pudimos iniciar sesión. Probá de nuevo.';
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | null>(null);

  const clearError = () => {
    if (error) {
      setError('');
    }
  };

  const switchMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setConfirmPassword('');
    setLoadingAction(null);
    setError('');
  };

  const handleAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError('Completá email y contraseña');
      return;
    }

    if (mode === 'signup' && normalizedPassword !== normalizedConfirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setError('');
      setLoadingAction(mode);

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
        const onboardingDone = await isOnboardingDone();
        router.replace(onboardingDone ? '/(tabs)' : '/onboarding');
        return;
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      router.replace('/(tabs)');
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>SplitSnap</Text>
          <Text style={styles.subtitle}>
            {mode === 'signup'
              ? 'Creá tu cuenta para empezar a dividir gastos.'
              : 'Iniciá sesión para seguir dividiendo gastos.'}
          </Text>
        </View>

        <AppCard animated={false} style={styles.card}>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);
              clearError();
            }}
            placeholder="tuemail@ejemplo.com"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="Contraseña"
            onChangeText={(value) => {
              setPassword(value);
              clearError();
            }}
            onSubmitEditing={() => {
              if (mode === 'login') {
                void handleAuth();
              }
            }}
            placeholder="Tu contraseña"
            returnKeyType={mode === 'signup' ? 'next' : 'done'}
            secureTextEntry
            textContentType="password"
            value={password}
          />

          {mode === 'signup' ? (
            <Field
              autoCapitalize="none"
              autoCorrect={false}
              label="Confirmar contraseña"
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError();
              }}
              onSubmitEditing={() => void handleAuth()}
              placeholder="Repetí tu contraseña"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={confirmPassword}
            />
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
            loading={loadingAction === mode}
            onPress={() => void handleAuth()}
          />

          <Pressable onPress={switchMode} style={styles.switchAction}>
            <Text style={styles.switchText}>
              {mode === 'signup'
                ? '¿Ya tenés cuenta? Iniciar sesión'
                : '¿No tenés cuenta? Crear una'}
            </Text>
          </Pressable>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  hero: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  brand: {
    color: '#F5F5F0',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E1E1E',
    gap: theme.spacing.md,
  },
  errorBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.24)',
    backgroundColor: 'rgba(255,69,58,0.12)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  errorText: {
    color: '#F5F5F0',
    fontSize: 14,
    lineHeight: 20,
  },
  switchAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  switchText: {
    color: '#A8B89C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
