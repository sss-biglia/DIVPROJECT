import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CategoryPicker } from '../../components/CategoryPicker';
import { CurrencyToggle } from '../../components/CurrencyToggle';
import {
  AppCard,
  EmptyState,
  Field,
  KeyboardScreen,
  PrimaryButton,
  SectionTitle,
} from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { convertUSDtoARS, fetchDolarBlue, formatARS } from '../../services/dolarService';
import { buildEqualSplits, normalizeExpenseCategory } from '../../utils/expense';

export default function EditExpenseScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId?: string; expenseId?: string }>();
  const router = useRouter();
  const { groups, saveGroup, dolarRate } = useApp();
  const group = useMemo(
    () => groups.find((entry) => entry.id === groupId),
    [groupId, groups]
  );
  const expense = useMemo(
    () => group?.expenses.find((entry) => entry.id === expenseId),
    [expenseId, group]
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? expense.amount.toString() : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(expense?.currency ?? 'ARS');
  const [note, setNote] = useState(expense?.note ?? '');
  const [category, setCategory] = useState(normalizeExpenseCategory(expense?.category));
  const [localDolarRate, setLocalDolarRate] = useState<number | undefined>(
    expense?.exchangeRateAtTime ?? dolarRate?.venta
  );
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount || 0);
  const convertedPreview =
    currency === 'USD' && localDolarRate && numericAmount > 0
      ? formatARS(convertUSDtoARS(numericAmount, {
          compra: localDolarRate,
          venta: localDolarRate,
          promedio: localDolarRate,
          fetchedAt: new Date().toISOString(),
        }))
      : null;

  const onCurrencyChange = async (nextCurrency: 'ARS' | 'USD') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrency(nextCurrency);

    if (nextCurrency === 'USD') {
      try {
        const rate = await fetchDolarBlue();
        setLocalDolarRate(rate.venta);
      } catch (error) {
        Alert.alert('Dólar no disponible', 'No se pudo actualizar el dólar blue en este momento.');
      }
    }
  };

  const onSave = async () => {
    if (!group || !expense) {
      return;
    }

    if (!description.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Revisá los campos', 'Agregá una descripción y un monto válido.');
      return;
    }

    try {
      setLoading(true);

      let exchangeRateAtTime: number | undefined;
      let convertedAmountARS: number | undefined;
      let totalForSplits = numericAmount;

      if (currency === 'USD') {
        const rate = await fetchDolarBlue();
        exchangeRateAtTime = rate.venta;
        convertedAmountARS = convertUSDtoARS(numericAmount, rate);
        totalForSplits = convertedAmountARS;
        setLocalDolarRate(rate.venta);
      }

      await saveGroup({
        ...group,
        expenses: group.expenses.map((entry) =>
          entry.id === expense.id
            ? {
                ...entry,
                description: description.trim(),
                amount: numericAmount,
                currency,
                note: note.trim(),
                category,
                exchangeRateAtTime,
                convertedAmountARS,
                splits: buildEqualSplits(
                  totalForSplits,
                  entry.splits.map((split) => split.memberId)
                ),
              }
            : entry
        ),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/group/${group.id}`);
    } catch (error) {
      Alert.alert('No se pudo actualizar el gasto', 'Por favor, intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!group || !expense) {
    return (
      <KeyboardScreen contentContainerStyle={styles.emptyContent}>
        <EmptyState
          title="Gasto no encontrado"
          message="Este gasto puede haber sido eliminado."
        />
        <PrimaryButton label="Volver a Grupos" onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace('/');
        }} />
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <SectionTitle title="Editar Gasto" subtitle="Ajustá lo básico y mantené el historial de división." />
      <AppCard>
        <Field
          autoCorrect={false}
          label="Descripción"
          onChangeText={setDescription}
          placeholder="Cena"
          value={description}
        />
        <CurrencyToggle value={currency} onChange={onCurrencyChange} dolarRate={localDolarRate} />
        {currency === 'USD' && localDolarRate ? (
          <Text style={styles.helperText}>1 u$s = ${Math.round(localDolarRate)} ARS (blue)</Text>
        ) : null}
        <Field
          autoCorrect={false}
          keyboardType="decimal-pad"
          label="Monto"
          onChangeText={setAmount}
          placeholder="120"
          value={amount}
        />
        {convertedPreview ? <Text style={styles.helperText}>= {convertedPreview}</Text> : null}
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryTitle}>Categoría</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>
        <Field
          autoCorrect={false}
          label="Nota"
          multiline
          numberOfLines={4}
          onChangeText={setNote}
          placeholder="Agregá contexto para este gasto"
          style={styles.noteField}
          textAlignVertical="top"
          value={note}
        />
      </AppCard>
      <PrimaryButton label="Guardar Cambios" loading={loading} onPress={() => void onSave()} />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  categoryBlock: {
    gap: theme.spacing.sm,
  },
  categoryTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  noteField: {
    minHeight: 140,
  },
});
