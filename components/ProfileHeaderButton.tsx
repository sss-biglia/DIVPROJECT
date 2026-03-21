import { Pressable, StyleSheet, Text } from 'react-native';

import { darkColors } from '../constants/metallicTheme';

interface ProfileHeaderButtonProps {
  initials: string;
  onPress: () => void;
  size?: number;
}

export function ProfileHeaderButton({
  initials,
  onPress,
  size = 36,
}: ProfileHeaderButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.label}>{initials || '?'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.textTertiary,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    marginRight: 8,
    marginTop: 2,
  },
  label: {
    color: darkColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
