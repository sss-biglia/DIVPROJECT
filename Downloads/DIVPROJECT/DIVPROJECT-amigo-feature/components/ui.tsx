import { forwardRef, ReactElement, ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import { theme } from '../constants/theme';

type ButtonVariant = 'accent' | 'neutral' | 'danger' | 'pay';

const usePressScale = () => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  };

  return {
    scale,
    onPressIn,
    onPressOut,
  };
};

export const Screen = ({
  children,
  scrollable = false,
  contentContainerStyle,
  includeTopInset = false,
  refreshControl,
}: {
  children: ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  includeTopInset?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) => {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={includeTopInset ? ['top', 'left', 'right'] : ['left', 'right']}
      style={styles.screen}
    >
      {content}
    </SafeAreaView>
  );
};

export const KeyboardScreen = ({
  children,
  contentContainerStyle,
  includeTopInset = false,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  includeTopInset?: boolean;
}) => (
  <SafeAreaView
    edges={includeTopInset ? ['top', 'left', 'right'] : ['left', 'right']}
    style={styles.screen}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fill}
    >
      <ScrollView
        contentContainerStyle={[styles.keyboardContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

export const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const AppCard = ({
  children,
  style,
  delay = 0,
  animated = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  animated?: boolean;
}) =>
  animated ? (
    <Reanimated.View entering={FadeInDown.delay(delay).duration(280)} style={[styles.card, style]}>
      {children}
    </Reanimated.View>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );

const getButtonColors = (variant: ButtonVariant) => {
  switch (variant) {
    case 'neutral':
      return {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.1)',
        textColor: theme.colors.textPrimary,
      };
    case 'danger':
      return {
        backgroundColor: 'rgba(255,69,58,0.12)',
        borderColor: 'rgba(255,69,58,0.25)',
        textColor: theme.colors.danger,
      };
    case 'pay':
      return {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
        textColor: '#1A2018',
      };
    default:
      return {
        backgroundColor: theme.colors.textPrimary,
        borderColor: theme.colors.textPrimary,
        textColor: theme.colors.background,
      };
  }
};

export const PrimaryButton = ({
  label,
  onPress,
  disabled,
  loading,
  variant = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
}) => {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const colors = getButtonColors(variant);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.button,
          {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textColor} />
        ) : (
          <Text style={[styles.buttonLabel, { color: colors.textColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

export const GhostButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => {
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.ghostButton}
      >
        <Text style={styles.ghostButtonLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const Field = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    style?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
  }
>(({ label, style, containerStyle, onFocus, onBlur, multiline, ...props }, ref) => {
  const borderAnim = useRef(new Animated.Value(0)).current;

  const borderColor = useMemo(
    () =>
      borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.06)', 'rgba(168,184,156,0.35)'],
      }),
    [borderAnim]
  );

  const animateFocus = (toValue: number) => {
    Animated.timing(borderAnim, {
      toValue,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Animated.View style={[styles.inputWrap, { borderColor }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          onFocus={(event) => {
            animateFocus(1);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            animateFocus(0);
            onBlur?.(event);
          }}
          multiline={multiline}
          {...props}
        />
      </Animated.View>
    </View>
  );
});

Field.displayName = 'Field';

export const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) => {
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.pill, selected && styles.pillSelected]}
      >
        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const EmptyState = ({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: string;
}) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!icon) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [icon, pulse]);

  return (
    <View style={styles.emptyState}>
      {icon ? (
        <Animated.Text style={[styles.emptyIcon, { transform: [{ scale: pulse }] }]}>
          {icon}
        </Animated.Text>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
};

export const Badge = ({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'accent' | 'success' | 'neutral';
}) => {
  const borderColor =
    tone === 'accent'
      ? theme.colors.textPrimary
      : tone === 'success'
        ? theme.colors.borderDefault
        : theme.colors.borderDefault;
  const backgroundColor =
    tone === 'accent'
      ? 'rgba(245,245,240,0.08)'
      : tone === 'success'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.03)';
  const textColor =
    tone === 'accent'
      ? theme.colors.textPrimary
      : tone === 'success'
        ? theme.colors.textSecondary
        : theme.colors.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

export const LoadingOverlay = ({ label }: { label: string }) => (
  <View style={styles.overlay}>
    <ActivityIndicator color={theme.colors.textPrimary} size="large" />
    <Text style={styles.overlayText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  keyboardContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title1,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    ...theme.typography.subhead,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  ghostButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
    ...theme.typography.caption,
    fontWeight: '500',
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  input: {
    minHeight: 52,
    color: theme.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  pillSelected: {
    backgroundColor: 'rgba(245,245,240,0.06)',
    borderColor: 'rgba(245,245,240,0.18)',
  },
  pillText: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: theme.colors.textPrimary,
  },
  emptyState: {
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title2,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    color: theme.colors.textSecondary,
    ...theme.typography.callout,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  overlayText: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeText: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
});
