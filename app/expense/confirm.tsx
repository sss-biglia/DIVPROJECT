import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryPicker } from '../../components/CategoryPicker';
import { CurrencyToggle } from '../../components/CurrencyToggle';
import { SuccessOverlay } from '../../components/SuccessOverlay';
import {
  AppCard,
  EmptyState,
  Field,
  KeyboardScreen,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { convertUSDtoARS, fetchDolarBlue, formatARS, formatUSD } from '../../services/dolarService';
import { saveReceiptImage } from '../../services/storage';
import { Expense } from '../../types';
import { buildEqualSplits, normalizeExpenseCategory } from '../../utils/expense';
import { createId } from '../../utils/id';

export default function ConfirmExpenseScreen() {
  const router = useRouter();
  const { groups, pendingDraft, saveExpense, saveGroup, setPendingDraft, dolarRate } = useApp();
  const [description, setDescription] = useState(pendingDraft?.description ?? '');
  const [amount, setAmount] = useState(pendingDraft ? pendingDraft.amount.toString() : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(pendingDraft?.currency ?? 'ARS');
  const [category, setCategory] = useState(normalizeExpenseCategory(pendingDraft?.category));
  const [groupId, setGroupId] = useState(pendingDraft?.groupId ?? groups[0]?.id);
  const [paidById, setPaidById] = useState(pendingDraft?.paidById);
  const [splitMode, setSplitMode] = useState<'equal' | 'selected'>(
    pendingDraft?.splitMode ?? 'equal'
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    pendingDraft?.selectedMemberIds ?? []
  );
  const [localDolarRate, setLocalDolarRate] = useState<number | undefined>(
    pendingDraft?.exchangeRateAtTime ?? dolarRate?.venta
  );
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const group = useMemo(() => groups.find((entry) => entry.id === groupId), [groupId, groups]);

  const previewSplitIds =
    splitMode === 'equal' ? group?.members.map((member) => member.id) ?? [] : selectedMemberIds;

  const numericAmount = Number(amount || 0);
  const convertedPreview =
    currency === 'USD' && localDolarRate && numericAmount > 0
      ? convertUSDtoARS(numericAmount, {
          compra: localDolarRate,
          venta: localDolarRate,
          promedio: localDolarRate,
          fetchedAt: new Date().toISOString(),
        })
      : undefined;

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const onCurrencyChange = async (nextCurrency: 'ARS' | 'USD') => {
    setCurrency(nextCurrency);

    if (nextCurrency === 'USD') {
      try {
        const rate = await fetchDolarBlue();
        setLocalDolarRate(rate.venta);
      } catch (error) {
        Alert.alert('Blue no disponible', 'No pudimos refrescar el tipo de cambio ahora.');
      }
    }
  };

  const onSave = async () => {
    if (!pendingDraft) {
      return;
    }

    if (!group) {
      Alert.alert('Elegí un grupo', 'Seleccioná un grupo antes de guardar.');
      return;
    }

    if (!description.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Revisá el gasto', 'Agregá una descripción y un monto válido.');
      return;
    }

    if (!paidById) {
      Alert.alert('Falta quién pagó', 'Elegí la persona que pagó este gasto.');
      return;
    }

    if (splitMode === 'selected' && selectedMemberIds.length === 0) {
      Alert.alert('Faltan integrantes', 'Elegí al menos una persona para dividirlo.');
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

      const expense: Expense = {
        id: createId(),
        description: description.trim(),
        amount: numericAmount,
        currency,
        paidById,
        splits: buildEqualSplits(totalForSplits, previewSplitIds),
        date: pendingDraft.date || new Date().toISOString(),
        receiptImageUri: pendingDraft.receiptImageUri,
        source: pendingDraft.source,
        merchant: pendingDraft.merchant,
        items: pendingDraft.items,
        category,
        exchangeRateAtTime,
        convertedAmountARS,
      };

      await saveExpense(group.id, expense);

      if (pendingDraft.receiptImageUri) {
        const storedUri = await saveReceiptImage(group.id, expense.id, pendingDraft.receiptImageUri);
        await saveGroup({
          ...group,
          expenses: [{ ...expense, receiptImageUri: storedUri }, ...group.expenses],
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessVisible(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPendingDraft(null);
      router.replace(`/group/${group.id}`);
    } catch (error) {
      Alert.alert('No pudimos guardar', 'Probá de nuevo en un momento.');
    } finally {
      setLoading(false);
      setSuccessVisible(false);
    }
  };

  if (!pendingDraft || groups.length === 0) {
    return (
      <Screen contentContainerStyle={styles.emptyScreen}>
        <EmptyState
          title="No hay nada para confirmar"
          message="Empezá desde escaneo o desde ingreso manual."
        />
        <PrimaryButton label="Ir a grupos" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <SectionTitle title="Confirmar gasto" subtitle="Revisá todo antes de guardarlo en el grupo." />

      {pendingDraft.receiptImageUri ? (
        <Image source={{ uri: pendingDraft.receiptImageUri }} style={styles.receiptPreview} />
      ) : null}

      <AppCard>
        <Field label="Descripción" onChangeText={setDescription} value={description} />
        <CurrencyToggle value={currency} onChange={onCurrencyChange} dolarRate={localDolarRate} />
        {currency === 'USD' && localDolarRate ? (
          <Text style={styles.metaText}>1 u$s = ${Math.round(localDolarRate)} ARS (blue)</Text>
        ) : null}
        <Field keyboardType="decimal-pad" label="Monto" onChangeText={setAmount} value={amount} />
        {convertedPreview ? <Text style={styles.metaText}>= {formatARS(convertedPreview)}</Text> : null}
        {pendingDraft.merchant ? (
          <Text style={styles.metaText}>Comercio: {pendingDraft.merchant}</Text>
        ) : null}

        <View style={styles.categoryBlock}>
          <Text style={styles.cardTitle}>Categoría</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>

        {pendingDraft.items?.length ? (
          <View style={styles.itemWrap}>
            {pendingDraft.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  {currency === 'USD' ? formatUSD(item.price) : formatARS(item.price)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Grupo</Text>
        <View style={styles.selectWrap}>
          {groups.map((entry) => (
            <Pill
              key={entry.id}
              label={`${entry.emoji} ${entry.name}`}
              onPress={() => {
                setGroupId(entry.id);
                setPaidById(undefined);
                setSelectedMemberIds([]);
              }}
              selected={groupId === entry.id}
            />
          ))}
        </View>
      </AppCard>

      {group ? (
        <>
          <AppCard>
            <Text style={styles.cardTitle}>Quién pagó</Text>
            <View style={styles.selectWrap}>
              {group.members.map((member) => (
                <Pill
                  key={member.id}
                  label={member.name}
                  onPress={() => setPaidById(member.id)}
                  selected={paidById === member.id}
                />
              ))}
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.cardTitle}>Cómo dividir</Text>
            <View style={styles.selectWrap}>
              <Pill
                label="Entre todos"
                onPress={() => setSplitMode('equal')}
                selected={splitMode === 'equal'}
              />
              <Pill
                label="Elegir personas"
                onPress={() => setSplitMode('selected')}
                selected={splitMode === 'selected'}
              />
            </View>

            {splitMode === 'selected' ? (
              <View style={styles.selectWrap}>
                {group.members.map((member) => (
                  <Pill
                    key={member.id}
                    label={member.name}
                    onPress={() => toggleMember(member.id)}
                    selected={selectedMemberIds.includes(member.id)}
                  />
                ))}
              </View>
            ) : null}
          </AppCard>
        </>
      ) : null}

      <PrimaryButton label="Guardar gasto" loading={loading} onPress={() => void onSave()} />
      <Pressable
        onPress={() => {
          setPendingDraft(null);
          router.back();
        }}
      >
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>

      <SuccessOverlay visible={successVisible} />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  receiptPreview: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
  },
  metaText: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    fontWeight: '600',
  },
  categoryBlock: {
    gap: theme.spacing.sm,
  },
  selectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  itemWrap: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 10,
  },
  itemName: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    flex: 1,
  },
  itemPrice: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    fontWeight: '700',
  },
  cancelText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    ...theme.typography.callout,
    fontWeight: '600',
  },
});
