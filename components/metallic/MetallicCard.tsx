import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { metallicGradient, metallicStyles } from '../../constants/metallicTheme';

interface MetallicCardProps extends PressableProps {
  children: ReactNode;
  accent?: boolean;
}

export function MetallicCard({ children, accent = false, style, ...props }: MetallicCardProps) {
  const cardStyle = [
    styles.card,
    accent && styles.accentCard,
    style,
  ];

  return (
    <Pressable style={cardStyle} {...props}>
      <LinearGradient
        colors={metallicGradient}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...metallicStyles.card,
    padding: 16,
  },
  accentCard: metallicStyles.accentCard as any,
  content: {
    backgroundColor: 'transparent',
    gap: 16,
  },
});
