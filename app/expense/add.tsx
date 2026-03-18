import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategoryPicker } from '../../components/CategoryPicker';
import { CurrencyToggle } from '../../components/CurrencyToggle';
import {
  AppCard,
  Field,
  KeyboardScreen,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { parseExpenseText } from '../../services/aiService';
import { convertUSDtoARS, fetchDolarBlue, formatARS } from '../../services/dolarService';
import { ExpenseDraft } from '../../types';
import { normalizeExpenseCategory } from '../../utils/expense';

const MIC_TOOLTIP_KEY = 'mic_tooltip_shown';

export default function AddExpenseScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const router = useRouter();
  const { groups, setPendingDraft, dolarRate } = useApp();
  const [entryMode, setEntryMode] = useState<'ai' | 'manual'>('ai');
  const [naturalText, setNaturalText] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [category, setCategory] = useState(normalizeExpenseCategory());
  const [localDolarRate, setLocalDolarRate] = useState<number | undefined>(dolarRate?.venta);
  const [loading, setLoading] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [micTooltipSeen, setMicTooltipSeen] = useState(true);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const loadTooltipState = async () => {
      const stored = await AsyncStorage.getItem(MIC_TOOLTIP_KEY);
      setMicTooltipSeen(stored === 'true');
    };

    void loadTooltipState();
  }, []);

  const groupsExist = groups.length > 0;

  const goToConfirm = (draft: ExpenseDraft) => {
    setPendingDraft(draft);
    router.push('/expense/confirm');
  };

  const onParse = async () => {
    if (!naturalText.trim()) {
      Alert.alert('Describe el gasto', 'Escribí algo como "Gasté 120 en el súper".');
      return;
    }

    try {
      setLoading(true);
      const extracted = await parseExpenseText(naturalText.trim());

      goToConfirm({
        amount: extracted.amount ?? 0,
        currency: extracted.currency || 'ARS',
        description: extracted.description || naturalText.trim(),
        date: new Date().toISOString(),
        source: 'text',
        groupId,
        splitMode: 'equal',
        selectedMemberIds: [],
        category: normalizeExpenseCategory(extracted.category),
      });
    } catch (error) {
      Alert.alert(
        'No pudimos interpretar el texto',
        error instanceof Error ? error.message : 'Probá con ingreso manual.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onManual = () => {
    const numericAmount = Number(amount);

    if (!description.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Revisá los datos', 'Ingresá una descripción y un monto válido.');
      return;
    }

    goToConfirm({
      amount: numericAmount,
      currency,
      description: description.trim(),
      date: new Date().toISOString(),
      source: 'manual',
      groupId,
      splitMode: 'equal',
      selectedMemberIds: [],
      category,
      exchangeRateAtTime: currency === 'USD' ? localDolarRate : undefined,
      convertedAmountARS:
        currency === 'USD' && localDolarRate
          ? convertUSDtoARS(numericAmount, {
              compra: localDolarRate,
              venta: localDolarRate,
              promedio: localDolarRate,
              fetchedAt: new Date().toISOString(),
            })
          : undefined,
    });
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

  const onPressMic = async () => {
    inputRef.current?.focus();

    if (!micTooltipSeen) {
      setShowMicTooltip(true);
      setMicTooltipSeen(true);
      await AsyncStorage.setItem(MIC_TOOLTIP_KEY, 'true');
      setTimeout(() => setShowMicTooltip(false), 3000);
    }
  };

  const convertedPreview =
    currency === 'USD' && localDolarRate && Number(amount) > 0
      ? formatARS(
          convertUSDtoARS(Number(amount), {
            compra: localDolarRate,
            venta: localDolarRate,
            promedio: localDolarRate,
            fetchedAt: new Date().toISOString(),
          })
        )
      : null;

  if (!groupsExist) {
    return (
      <Screen contentContainerStyle={styles.emptyScreen}>
        <Text style={styles.title}>Necesitás un grupo primero</Text>
        <Text style={styles.subtitle}>Creá un grupo antes de sumar un gasto.</Text>
        <PrimaryButton label="Ir a grupos" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <SectionTitle
        title="Nuevo gasto"
        subtitle="Escribilo como te salga natural o completalo manualmente."
      />

      <View style={styles.toggleRow}>
        <Pill label="Texto + IA" onPress={() => setEntryMode('ai')} selected={entryMode === 'ai'} />
        <Pill label="Manual" onPress={() => setEntryMode('manual')} selected={entryMode === 'manual'} />
      </View>

      {entryMode === 'ai' ? (
        <AppCard>
          <View style={styles.aiRow}>
            <View style={styles.aiInputWrap}>
              <Field
                ref={inputRef}
                label="¿En qué gastaste?"
                multiline
                numberOfLines={4}
                onChangeText={setNaturalText}
                placeholder="Gasté 120 en el supermercado"
                style={styles.multilineInput}
                textAlignVertical="top"
                value={naturalText}
              />
            </View>

            <View style={styles.micWrap}>
              <Pressable onPress={() => void onPressMic()} style={styles.micButton}>
                <Ionicons name="mic-outline" size={20} color={theme.colors.textPrimary} />
              </Pressable>
              {showMicTooltip ? (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>Tocá el micrófono del teclado para dictar</Text>
                </View>
              ) : null}
            </View>
          </View>

          <PrimaryButton label="Parsear con IA" loading={loading} onPress={() => void onParse()} />
        </AppCard>
      ) : (
        <AppCard>
          <CurrencyToggle value={currency} onChange={onCurrencyChange} dolarRate={localDolarRate} />
          {currency === 'USD' && localDolarRate ? (
            <Text style={styles.helperText}>1 USD = ${Math.round(localDolarRate)} ARS (blue)</Text>
          ) : null}
          <Field
            keyboardType="decimal-pad"
            label="Monto"
            onChangeText={setAmount}
            placeholder="120"
            value={amount}
          />
          {convertedPreview ? <Text style={styles.helperText}>= {convertedPreview}</Text> : null}
          <Field
            label="Descripción"
            onChangeText={setDescription}
            placeholder="Supermercado"
            value={description}
          />
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>Categoría</Text>
            <CategoryPicker value={category} onChange={setCategory} />
          </View>
          <PrimaryButton label="Continuar" onPress={onManual} />
        </AppCard>
      )}
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  aiRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  aiInputWrap: {
    flex: 1,
  },
  micWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 28,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tooltip: {
    maxWidth: 180,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tooltipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  multilineInput: {
    minHeight: 140,
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
    ...theme.typography.footnote,
    fontWeight: '600',
  },
  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    ...theme.typography.title1,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    ...theme.typography.callout,
  },
});
