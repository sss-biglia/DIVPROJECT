import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';

import { theme } from '../constants/theme';

const { height } = Dimensions.get('window');

interface IntroScreenProps {
  onFinish: () => void;
}

export const IntroScreen = ({ onFinish }: IntroScreenProps) => {
  const slideAnim = useRef(new Animated.Value(-height)).current; // starts OFF SCREEN at the TOP

  useEffect(() => {
    // Slide logo DOWN from top to center
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 1000, // exactly 1 second
      easing: Easing.out(Easing.cubic), // smooth deceleration
      useNativeDriver: true,
    }).start(() => {
      // After landing, do a small bounce effect
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -18, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ]).start();
    });

    // Navigate to app after animation
    const timer = setTimeout(() => {
      onFinish();
    }, 2100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={styles.container}>
      <Animated.Image
        source={require('../assets/icon/div.logo.png')}
        style={[styles.logo, { transform: [{ translateY: slideAnim }] }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  logo: {
    width: 180,
    height: 180,
  },
});