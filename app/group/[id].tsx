import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddMemberSheet } from '../../components/AddMemberSheet';
import { MemberAvatar } from '../../components/MemberAvatar';
import { MPPaymentSheet } from '../../components/MPPaymentSheet';
import { QuickAddSheet } from '../../components/QuickAddSheet';
import { Badge, EmptyState, PrimaryButton, Screen } from '../../components/ui';
import { accentColor, darkColors, metallicStyles } from '../../constants/metallicTheme';
import { useApp } from '../../context/AppProvider';
import {
  generateSummary,
  getAmountInARS,
  getGroupTotalSpent,
  getMemberBalances,
  hasUSDExpenses,
  simplifySettlements,
} from '../../services/balanceService';
import { formatARS, formatUSD } from '../../services/dolarService';
import { CATEGORY_META, Expense, Group, Member, SettlementRecord } from '../../types';
import { createId, generateInviteCode } from '../../utils/id';
import { roundCurrency } from '../../utils/format';
import { getPaymentDetailsForMember, isCurrentUserName } from '../../utils/profile';
import { MetallicCard } from '../../components/metallic/MetallicCard';

type ViewMode = 'expenses' | 'settled';

interface ExpenseSection {
  date: string;
  label: string;
  data: Expense[];
}

const buildExpenseSections = (expenses: Expense[]): ExpenseSection[] => {
  const groups: ExpenseSection[] = [];
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sorted.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const dateKey = expenseDate.toDateString();
    const existing = groups.find((entry) => entry.date === dateKey);

    if (existing) {
      existing.data.push(expense);
      return;
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label = '';
    if (expenseDate.toDateString() === today.toDateString()) {
      label = 'HOY';
    } else if (expenseDate.toDateString() === yesterday.toDateString()) {
      label = 'AYER';
    } else {
      label = expenseDate
        .toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
        .toUpperCase();
    }

    groups.push({ date: dateKey, label, data: [expense] });
  });

  return groups;
};

const getDateLabel = (value: string) =>
  new Date(value).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });

const reconcileSettlements = (group: Group): SettlementRecord[] => {
  const debtsWithoutSettlements = simplifySettlements({
    ...group,
    settlements: [],
  });
  const availableByPair = new Map<string, number>();

  debtsWithoutSettlements.forEach((settlement) => {
    const key = `${settlement.from.id}->${settlement.to.id}`;
    availableByPair.set(
      key,
      roundCurrency((availableByPair.get(key) ?? 0) + settlement.amount)
    );
  });

  const chronologicalSettlements = [...(group.settlements ?? [])].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  );
  const validSettlementIds = new Set<string>();

  chronologicalSettlements.forEach((settlement) => {
    const key = `${settlement.fromMemberId}->${settlement.toMemberId}`;
    const availableAmount = availableByPair.get(key) ?? 0;

    if (availableAmount + 0.009 < settlement.amount) {
      return;
    }

    availableByPair.set(key, roundCurrency(availableAmount - settlement.amount));
    validSettlementIds.add(settlement.id);
  });

  return (group.settlements ?? []).filter((settlement) => validSettlementIds.has(settlement.id));
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    groups, removeGroup, saveGroup, addSettlement, profile, dolarRate, refreshDolarRate,
  } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('expenses');
  const [selectedDebt, setSelectedDebt] = useState<{
    fromMemberId: string;
    toMemberId: string;
    memberName: string;
    amount: number;
    mpAlias?: string;
    mpPaymentLink?: string;
    originalAmountUSD?: number;
  } | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const speedDialProgress = useRef(new Animated.Value(0)).current;
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const [copyLabel, setCopyLabel] = useState('Copiar');

  const group = groups.find((entry) => entry.id === id);

  const expenseSections = useMemo(
    () => buildExpenseSections(group?.expenses ?? []),
    [group?.expenses]
  );

  useEffect(() => {
    if (!group || group.inviteCode) {
      return;
    }

    void saveGroup({
      ...group,
      inviteCode: generateInviteCode(),
    });
  }, [group, saveGroup]);

  const toggleSpeedDial = (open: boolean) => {
    setSpeedDialOpen(open);
    Animated.timing(speedDialProgress, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const balances = group ? getMemberBalances(group) : [];
  const membersWithBalance = useMemo(
    () =>
      group?.members.map((member) => ({
        ...member,
        balance: balances.find((b) => b.member.id === member.id)?.net ?? 0,
      })) ?? [],
    [group?.members, balances]
  );

  const MAX_VISIBLE = 5;
  const visibleMembers =
    membersWithBalance.length <= 6
      ? membersWithBalance
      : membersWithBalance.slice(0, MAX_VISIBLE);
  const hasOverflow = membersWithBalance.length > 6;
  const overflowCount = membersWithBalance.length - MAX_VISIBLE;

  const sortedMembersForModal = useMemo(
    () =>
      [...membersWithBalance].sort((a, b) => {
        const aIsNegative = a.balance < 0;
        const bIsNegative = b.balance < 0;

        if (aIsNegative && !bIsNegative) return -1;
        if (!aIsNegative && bIsNegative) return 1;

        if (aIsNegative) {
          return a.balance - b.balance;
        }
        if (a.balance > 0) {
          return b.balance - a.balance;
        }
        return a.name.localeCompare(b.name);
      }),
    [membersWithBalance]
  );

  if (!group) {
    return (
      <Screen includeTopInset>
        <View style={styles.missingWrap}>
          <EmptyState
            title="No encontramos este grupo"
            message="Puede que haya sido eliminado o que todavia no se haya sincronizado."
          />
        </View>
      </Screen>
    );
  }

  const settlementSuggestions = simplifySettlements(group);
  const settledRecords = [...(group.settlements ?? [])].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
  const receiptExpenses = group.expenses.filter((expense) => expense.receiptImageUri);
  const totalARS = getGroupTotalSpent(group);
  const hasUSD = hasUSDExpenses(group);

  const onDeleteGroup = () => {
    Alert.alert('¿Eliminar grupo?', 'Esto borra el grupo y todos sus gastos guardados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace('/');
          setTimeout(() => removeGroup(group.id), 500); // delete AFTER navigation completes
        },
      },
    ]);
  };

  const addMember = async (name: string, color: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextMember: Member = {
      id: createId(),
      name,
      color,
    };

    await saveGroup({
      ...group,
      members: [...group.members, nextMember],
    });
    setAddMemberVisible(false);
  };

  const markDebtSettled = async () => {
    if (!selectedDebt) {
      return;
    }

    try {
      const settlement: SettlementRecord = {
        id: createId(),
        fromMemberId: selectedDebt.fromMemberId,
        toMemberId: selectedDebt.toMemberId,
        amount: selectedDebt.amount,
        currency: 'ARS',
        originalAmountUSD: selectedDebt.originalAmountUSD,
        date: new Date().toISOString(),
      };

      await addSettlement(group.id, settlement);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedDebt(null);
    } catch (error) {
      Alert.alert('No pudimos saldar', 'Probá de nuevo en un momento.');
    }
  };

  const onShareSummary = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const summary = generateSummary(group, dolarRate?.venta);
    await Share.share({ message: summary });
  };

  const handleCopyCode = () => {
    if (!group?.inviteCode) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Clipboard.setStringAsync(group.inviteCode);
    setCopyLabel('Copiado!');
    setTimeout(() => setCopyLabel('Copiar'), 2000);
  };

  const deleteExpense = async (expenseId: string) => {
    const currentGroup = groups.find((entry) => entry.id === id);

    if (!currentGroup) {
      return;
    }

    try {
      swipeableRefs.current[expenseId]?.close();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedExpenses = currentGroup.expenses.filter((expense) => expense.id !== expenseId);
      const nextGroup: Group = {
        ...currentGroup,
        expenses: updatedExpenses,
      };

      await saveGroup({
        ...nextGroup,
        settlements: reconcileSettlements(nextGroup),
      });
      delete swipeableRefs.current[expenseId];
    } catch (error) {
      Alert.alert('No pudimos borrar el gasto', 'Probá de nuevo en un momento.');
    }
  };

  const renderExpenseRow = ({
    item,
    index,
    section,
  }: {
    item: Expense;
    index: number;
    section: ExpenseSection;
  }) => {
    const expenseId = item.id;
    const payer = group.members.find((member) => member.id === item.paidById);
    const category = CATEGORY_META[item.category ?? 'other'];
    const isLast = index === section.data.length - 1;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[expenseId] = ref;
            return;
          }

          delete swipeableRefs.current[expenseId];
        }}
        overshootRight={false}
        onSwipeableWillOpen={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        renderRightActions={() => (
          <Pressable onPress={() => void deleteExpense(expenseId)} style={styles.deleteAction}>
            <Ionicons color={darkColors.textPrimary} name="trash-outline" size={20} />
          </Pressable>
        )}
      >
        <View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseEmoji}>{category.emoji}</Text>

            <View style={styles.expenseCopy}>
              <Text style={styles.expenseTitle}>{item.description}</Text>
              <Text style={styles.expenseMeta}>
                Pagó: {payer?.name ?? 'Alguien'} · {getDateLabel(item.date)}
              </Text>
              {item.note ? <Text style={styles.expenseNote}>"{item.note}"</Text> : null}
            </View>

            <View style={styles.expenseRight}>
              <View style={styles.expenseAmountBlock}>
                <Text style={styles.expenseAmount}>
                  {item.currency === 'USD' ? formatUSD(item.amount) : formatARS(getAmountInARS(item))}
                </Text>
                {item.currency === 'USD' && item.convertedAmountARS ? (
                  <Text style={styles.expenseAmountSecondary}>{formatARS(item.convertedAmountARS)}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/expense/edit?groupId=${group.id}&expenseId=${item.id}`);
                }}
                style={styles.editButton}
              >
                <Ionicons color="rgba(255,255,255,0.3)" name="pencil" size={14} />
              </Pressable>
            </View>
          </View>
          {!isLast ? <View style={styles.rowDivider} /> : null}
        </View>
      </Swipeable>
    );
  };

  return (
    <Screen includeTopInset>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.iconButton}
        >
          <Ionicons color={darkColors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void onShareSummary()} style={styles.iconButton}>
            <Ionicons color={darkColors.textPrimary} name="share-outline" size={18} />
          </Pressable>
          <Pressable onPress={onDeleteGroup} style={styles.iconButton}>
            <Ionicons color="#f87171" name="trash-outline" size={18} />
          </Pressable>
        </View>
      </View>

      <MetallicCard>
        <Text style={styles.groupEmoji}>{group.emoji}</Text>
        <Text style={metallicStyles.title1}>{group.name}</Text>
        <View style={styles.totalCard}>
          <Text style={metallicStyles.caption}>TOTAL DEL GRUPO</Text>
          <Text style={[metallicStyles.title1, { fontSize: 34, letterSpacing: -1 }]}>{formatARS(totalARS)}</Text>
          {hasUSD ? <Text style={metallicStyles.footnote}>Incluye conversiones USD → ARS</Text> : null}
        </View>
        <Text style={metallicStyles.footnote}>
          {group.members.length} personas · {group.expenses.length} gastos
        </Text>
      </MetallicCard>

      <MetallicCard>
        <Text style={metallicStyles.caption}>PARTICIPANTES</Text>
        <View style={styles.membersGrid}>
          {visibleMembers.map((member) => (
            <View key={member.id} style={styles.memberCell}>
              <MemberAvatar
                name={member.name}
                color={member.color}
                size="sm"
                isCurrentUser={isCurrentUserName(profile, member.name)}
              />
              <Text style={[metallicStyles.footnote, styles.memberName]} numberOfLines={1}>
                {member.name}
              </Text>
              <Text
                style={[
                  styles.memberBalance,
                  member.balance > 0
                    ? styles.balancePositive
                    : member.balance < 0
                      ? styles.balanceNegative
                      : styles.balanceZero,
                ]}
              >
                {formatARS(Math.abs(member.balance))}
              </Text>
            </View>
          ))}
          {hasOverflow && (
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllMembers(true);
              }}
              style={styles.overflowCell}
            >
              <Text style={[metallicStyles.callout, { fontWeight: '700' }]}>+{overflowCount} más</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.memberActionsRow}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddMemberVisible(true);
            }}
            style={styles.memberActionButton}
          >
            <Text style={styles.memberActionButtonLabel}>+ Add Participant</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setInviteModalVisible(true);
            }}
            style={[styles.memberActionButton, styles.memberActionButtonAccent]}
          >
            <Text style={[styles.memberActionButtonLabel, { color: '#b8c87a' }]}>Group Code</Text>
          </Pressable>
        </View>
      </MetallicCard>

      <MetallicCard accent>
        <View style={styles.balanceHeader}>
          <Text style={metallicStyles.caption}>TE DEBEN / DEBÉS</Text>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void refreshDolarRate();
            }}
            style={styles.ratePill}
          >
            <Text style={[metallicStyles.caption, { color: darkColors.textSecondary }]}>Blue hoy: ${Math.round(dolarRate?.venta ?? 0)}</Text>
          </Pressable>
        </View>

        {settlementSuggestions.length === 0 ? (
          <Text style={styles.emptyInline}>Todo está saldado en este grupo.</Text>
        ) : (
          settlementSuggestions.map((settlement) => (
            <View key={`${settlement.from.id}-${settlement.to.id}`} style={styles.debtRow}>
              <View style={styles.debtLeft}>
                <MemberAvatar
                  name={settlement.from.name}
                  color={settlement.from.color}
                  size="sm"
                  isCurrentUser={isCurrentUserName(profile, settlement.from.name)}
                />
                <View style={styles.debtCopy}>
                  <Text style={metallicStyles.callout}>{settlement.from.name}</Text>
                  <Text style={metallicStyles.footnote}>le debe a {settlement.to.name}</Text>
                  {settlement.originalAmountUSD ? (
                    <Text style={metallicStyles.caption}>desde {formatUSD(settlement.originalAmountUSD)}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.debtRight}>
                <Text style={styles.debtAmount}>{formatARS(settlement.amount)}</Text>
                <PrimaryButton
                  label="Pagar 💸"
                  variant="pay"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const paymentDetails = getPaymentDetailsForMember(profile, settlement.to.name);

                    setSelectedDebt({
                      fromMemberId: settlement.from.id,
                      toMemberId: settlement.to.id,
                      memberName: settlement.to.name,
                      amount: settlement.amount,
                      originalAmountUSD: settlement.originalAmountUSD,
                      ...paymentDetails,
                    });
                  }}
                />
              </View>
            </View>
          ))
        )}
      </MetallicCard>

      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('expenses');
          }}
          style={[styles.segmentButton, viewMode === 'expenses' && styles.segmentButtonActive]}
        >
          <Text style={[metallicStyles.footnote, styles.segmentLabel, viewMode === 'expenses' && styles.segmentLabelActive]}>
            Gastos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('settled');
          }}
          style={[styles.segmentButton, viewMode === 'settled' && styles.segmentButtonActive]}
        >
          <Text style={[metallicStyles.footnote, styles.segmentLabel, viewMode === 'settled' && styles.segmentLabelActive]}>
            Saldados
          </Text>
        </Pressable>
      </View>

      {viewMode === 'expenses' ? (
        group.expenses.length === 0 ? (
          <EmptyState icon="🧾" title="Sin gastos por ahora" message="Escaneá un ticket o ingresá un gasto" />
        ) : (
          <SectionList
            scrollEnabled={false}
            sections={expenseSections}
            keyExtractor={(item) => item.id}
            renderItem={renderExpenseRow}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text style={[metallicStyles.caption, styles.sectionHeaderLabel]}>{section.label}</Text>
            )}
            contentContainerStyle={styles.sectionListContent}
          />
        )
      ) : settledRecords.length === 0 ? (
        <EmptyState
          title="Todavía no hay saldados"
          message="Los pagos marcados como resueltos van a aparecer acá."
        />
      ) : (
        <View style={styles.settledList}>
          {settledRecords.map((record) => {
            const from = group.members.find((member) => member.id === record.fromMemberId);
            const to = group.members.find((member) => member.id === record.toMemberId);

            return (
              <View key={record.id} style={styles.settledRow}>
                <View style={styles.settledCopy}>
                  <Text style={metallicStyles.callout}>
                    {from?.name ?? 'Alguien'} le pagó a {to?.name ?? 'alguien'}
                  </Text>
                  <Text style={styles.settledSubtitle}>✓ Saldado</Text>
                </View>
                <Text style={styles.settledAmount}>{formatARS(record.amount)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {receiptExpenses.length > 0 ? (
        <View style={styles.receiptsBlock}>
          <Text style={styles.sectionHeaderLabel}>COMPROBANTES</Text>
          <FlatList
            horizontal
            data={receiptExpenses}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.receiptsList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/receipt-viewer?groupId=${group.id}&expenseId=${item.id}`);
                }}
                style={styles.receiptThumb}
              >
                {item.receiptImageUri ? <Image source={{ uri: item.receiptImageUri }} style={styles.receiptImage} /> : null}
              </Pressable>
            )}
          />
        </View>
      ) : null}
      </ScrollView>

      {speedDialOpen ? (
        <Pressable
          style={styles.overlay}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSpeedDial(false);
          }}
        />
      ) : null}

      <Animated.View
        style={[
          styles.speedDialOption,
          styles.speedDialOptionTop,
          {
            opacity: speedDialProgress,
            transform: [
              {
                translateY: speedDialProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSpeedDial(false);
            router.push(`/expense/scan?groupId=${group.id}`);
          }}
          style={styles.speedDialPill}
        >
          <Text style={styles.speedDialLabel}>📷 Escanear</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.speedDialOption,
          styles.speedDialOptionBottom,
          {
            opacity: speedDialProgress,
            transform: [
              {
                translateY: speedDialProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSpeedDial(false);
            router.push(`/expense/add?groupId=${group.id}`);
          }}
          style={styles.speedDialPill}
        >
          <Text style={styles.speedDialLabel}>✏️ Manual</Text>
        </Pressable>
      </Animated.View>

      <View style={styles.fabWrap}>
        <Pressable
          onLongPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSpeedDial(!speedDialOpen);
          }}
          onPress={() => setQuickAddVisible(true)}
          style={styles.fab}
        >
          <Ionicons color={darkColors.background} name="add" size={30} />
        </Pressable>
      </View>

      <AddMemberSheet
        visible={addMemberVisible}
        onClose={() => setAddMemberVisible(false)}
        onAddMember={(name, color) => void addMember(name, color)}
      />

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <Pressable style={styles.centeredModalBackdrop} onPress={() => setInviteModalVisible(false)}>
          <Pressable style={styles.inviteModalContainer}>
            <Text style={styles.inviteModalTitle}>Código del Grupo</Text>
            <Text style={styles.inviteModalSubtitle}>
              Compartí este código para que tus amigos se unan.
            </Text>
            <View style={styles.codeDisplayCard}>
              <Text style={styles.inviteModalCodeText}>{group.inviteCode}</Text>
            </View>
            <PrimaryButton label={copyLabel} onPress={handleCopyCode} />
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInviteModalVisible(false);
              }}
            >
              <Text style={styles.modalCancel}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAllMembers} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Todos los participantes</Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAllMembers(false);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={22} color={darkColors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={sortedMembersForModal}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item: member }) => (
                <View style={styles.modalMemberRow}>
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    size="md"
                    isCurrentUser={isCurrentUserName(profile, member.name)}
                  />
                  <Text style={styles.modalMemberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text
                    style={[
                      styles.modalMemberBalance,
                      member.balance > 0
                        ? styles.balancePositive
                        : member.balance < 0
                          ? styles.balanceNegative
                          : styles.balanceZero,
                    ]}
                  >
                    {formatARS(Math.abs(member.balance))}
                  </Text>
                </View>
              )}
            />
            <PrimaryButton
              label="Cerrar"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllMembers(false);
              }}
              variant="neutral"
            />
          </View>
        </View>
      </Modal>

      <MPPaymentSheet
        visible={!!selectedDebt}
        onClose={() => setSelectedDebt(null)}
        onSettle={() => void markDebtSettled()}
        memberName={selectedDebt?.memberName ?? ''}
        amount={selectedDebt?.amount ?? 0}
        currency="ARS"
        mpAlias={selectedDebt?.mpAlias}
        mpPaymentLink={selectedDebt?.mpPaymentLink}
        originalAmountUSD={selectedDebt?.originalAmountUSD}
      />
      <QuickAddSheet
        visible={quickAddVisible}
        groups={groups}
        onClose={() => setQuickAddVisible(false)}
        onSelectAction={(_groupId, action) => {
          setQuickAddVisible(false);
          if (action === 'scan') {
            router.push(`/expense/scan?groupId=${group.id}`);
          } else {
            router.push(`/expense/add?groupId=${group.id}`);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 140,
    gap: 16,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.card,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
  },
  groupEmoji: {
    fontSize: 42,
  },
  totalCard: {
    backgroundColor: darkColors.cardSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    padding: 16,
    gap: 4,
  },
  membersSectionTag: {
    paddingTop: 8,
    marginBottom: 16,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberCell: {
    flexBasis: '30%',
    backgroundColor: darkColors.cardSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  memberName: {
    color: darkColors.textPrimary,
    ...metallicStyles.footnote,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
  },
  memberBalance: {
    color: 'rgba(245,245,240,0.74)',
    ...metallicStyles.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  balancePositive: {
    color: '#4ade80',
  },
  balanceNegative: {
    color: '#f87171',
  },
  balanceZero: {
    color: 'rgba(245,245,240,0.68)',
  },
  overflowCell: {
    flexBasis: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: darkColors.card,
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    padding: 16,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: darkColors.textPrimary,
    ...metallicStyles.title2,
  },
  modalList: {
    gap: 12,
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  modalMemberName: {
    flex: 1,
    color: darkColors.textPrimary,
    ...metallicStyles.callout,
    fontWeight: '600',
  },
  modalMemberBalance: {
    ...metallicStyles.callout,
    fontWeight: '700',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  ratePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.cardSecondary,
  },
  emptyInline: {
    color: darkColors.textSecondary,
    ...metallicStyles.callout,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  debtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  debtCopy: {
    gap: 2,
    flex: 1,
  },
  debtName: {
    color: darkColors.textPrimary,
    ...metallicStyles.callout,
    fontWeight: '600',
  },
  debtRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  debtAmount: {
    color: accentColor,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  segmentWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.card,
    borderRadius: 16,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: darkColors.cardSecondary,
  },
  segmentLabel: {
    color: darkColors.textSecondary,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: '#F5F5F0',
  },
  sectionListContent: {
    gap: 12,
  },
  receiptsBlock: {
    gap: 12,
  },
  receiptsList: {
    gap: 12,
  },
  receiptThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.card,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeaderLabel: {
    paddingTop: 16,
    paddingBottom: 6,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  expenseRow: {
    backgroundColor: darkColors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  expenseEmoji: {
    fontSize: 28,
  },
  expenseCopy: {
    flex: 1,
    gap: 2,
  },
  expenseTitle: {
    color: darkColors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  expenseMeta: {
    color: darkColors.textSecondary,
    fontSize: 12,
  },
  expenseNote: {
    color: darkColors.textTertiary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseAmountBlock: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: darkColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  expenseAmountSecondary: {
    color: darkColors.textSecondary,
    fontSize: 11,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginLeft: 54,
  },
  deleteAction: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f87171',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  settledList: {
    gap: 12,
  },
  settledRow: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settledCopy: {
    gap: 4,
    flex: 1,
  },
  settledTitle: {
    color: darkColors.textPrimary,
    ...metallicStyles.callout,
  },
  settledSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 12,
  },
  settledAmount: {
    color: darkColors.textTertiary,
    fontSize: 15,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  fabWrap: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.textPrimary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  speedDialOption: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  speedDialOptionTop: {
    bottom: 166,
  },
  speedDialOptionBottom: {
    bottom: 112,
  },
  speedDialPill: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.card,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedDialLabel: {
    color: darkColors.textPrimary,
    ...metallicStyles.footnote,
    fontWeight: '600',
  },
  memberActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  memberActionButton: {
    flex: 1,
    backgroundColor: darkColors.cardSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  memberActionButtonAccent: {
    borderColor: 'rgba(152, 168, 105, 0.4)',
    backgroundColor: 'rgba(152, 168, 105, 0.1)',
  },
  memberActionButtonLabel: {
    color: 'rgba(245,245,240,0.84)',
    ...metallicStyles.footnote,
    fontWeight: '600',
    fontSize: 13,
  },
  centeredModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  inviteModalContainer: {
    backgroundColor: darkColors.card,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    width: '100%',
    alignItems: 'center',
  },
  inviteModalTitle: { ...metallicStyles.headline, textAlign: 'center' },
  inviteModalSubtitle: { ...metallicStyles.subhead, textAlign: 'center' },
  codeDisplayCard: {
    backgroundColor: darkColors.cardSecondary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
  },
  inviteModalCodeText: {
    color: darkColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  modalCancel: { ...metallicStyles.footnote, padding: 8, textAlign: 'center' },
});
