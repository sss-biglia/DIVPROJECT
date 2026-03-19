import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';
import { CATEGORY_META, ExpenseCategory } from '../types';
import { expenseCategories } from '../utils/expense';

interface CategoryPickerProps {
  value?: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
}

export function CategoryPicker({ value = 'other', onChange }: CategoryPickerProps) {
  return (
    <View style={styles.grid}>
      {expenseCategories.map((category) => {
        const meta = CATEGORY_META[category];
        const selected = value === category;

        return (
          <Pressable
            key={category}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(category);
            }}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <Text style={styles.emoji}>{meta.emoji}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  item: {
    width: '47%',
    minHeight: 68,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 6,
  },
  itemSelected: {
    borderColor: 'rgba(245,245,240,0.16)',
    backgroundColor: 'rgba(245,245,240,0.06)',
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    color: theme.colors.textPrimary,
  },
});
