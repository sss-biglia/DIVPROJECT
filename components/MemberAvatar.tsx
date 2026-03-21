import { StyleSheet, Text, View } from 'react-native';

import { darkColors } from '../constants/metallicTheme';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

interface MemberAvatarProps {
  name: string;
  color: string;
  size?: AvatarSize;
  isCurrentUser?: boolean;
}

export function MemberAvatar({
  name,
  color,
  size = 'md',
  isCurrentUser = false,
}: MemberAvatarProps) {
  const dimension = sizeMap[size];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: size === 'lg' ? 20 : size === 'md' ? 14 : 12,
          },
        ]}
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
      {isCurrentUser ? <View style={styles.currentDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  initial: {
    color: darkColors.textPrimary,
    fontWeight: '700',
  },
  currentDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: darkColors.textPrimary,
    borderWidth: 1.5,
    borderColor: darkColors.background,
  },
});
