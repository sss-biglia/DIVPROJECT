import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

interface SuccessOverlayProps {
  visible: boolean;
  label?: string;
}

export function SuccessOverlay({
  visible,
  label = 'Gasto guardado',
}: SuccessOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.6);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        mass: 0.8,
      }),
    ]).start();
  }, [opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
          <Ionicons color={theme.colors.background} name="checkmark" size={32} />
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
});
