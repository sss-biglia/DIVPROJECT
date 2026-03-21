import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { darkColors, metallicStyles } from '../constants/metallicTheme';

interface CurrencyToggleProps {
  value: 'ARS' | 'USD';
  onChange: (currency: 'ARS' | 'USD') => void;
  dolarRate?: number;
}

export function CurrencyToggle({ value, onChange, dolarRate }: CurrencyToggleProps) {
  const options: Array<{ key: 'ARS' | 'USD'; label: string }> = [
    { key: 'ARS', label: '$ ARS' },
    { key: 'USD', label: 'USD $' },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.key === value;

          return (
            <Pressable
              key={option.key}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(option.key);
              }}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[metallicStyles.headline, styles.label, selected && styles.labelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {value === 'USD' && dolarRate ? <Text style={metallicStyles.footnote}>Blue: ${Math.round(dolarRate)} · Saldar en pesos</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: darkColors.card,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: 'rgba(245,245,240,0.08)',
    borderColor: 'rgba(245,245,240,0.16)',
  },
  label: {
    fontWeight: '700',
  },
  labelSelected: {
    color: darkColors.textPrimary,
  },
});
