import * as Haptics from 'expo-haptics';
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
import { TickerNumber } from '../../components/TickerNumber';
import { Badge, EmptyState, PrimaryButton } from '../../components/ui';
import { theme } from '../../constants/theme';
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
import { CATEGORY_META, Expense, Member, SettlementRecord } from '../../types';
import { createId, generateInviteCode } from '../../utils/id';
import { getPaymentDetailsForMember, isCurrentUserName } from '../../utils/profile';

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

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, removeGroup, saveGroup, addSettlement, profile, dolarRate, refreshDolarRate } =
    useApp();
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
  const speedDialProgress = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

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

  const animateFab = () => {
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 24,
        bounciness: 0,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
    ]).start();
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

  const renderExpenseRow = ({
    item,
    index,
    section,
  }: {
    item: Expense;
    index: number;
    section: ExpenseSection;
  }) => {
    const payer = group.members.find((member) => member.id === item.paidById);
    const category = CATEGORY_META[item.category ?? 'other'];
    const isLast = index === section.data.length - 1;

    return (
      <Swipeable
        overshootRight={false}
        onSwipeableWillOpen={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        renderRightActions={() => (
          <Pressable onPress={() => void deleteExpense(item.id)} style={styles.deleteAction}>
            <Ionicons color={theme.colors.textPrimary} name="trash-outline" size={20} />
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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void onShareSummary()} style={styles.iconButton}>
            <Ionicons color={theme.colors.textPrimary} name="share-outline" size={18} />
          </Pressable>
          <Pressable onPress={onDeleteGroup} style={styles.iconButton}>
            <Ionicons color={theme.colors.danger} name="trash-outline" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.groupEmoji}>{group.emoji}</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        <View style={styles.totalCard}>
          <Text style={styles.sectionTag}>TOTAL DEL GRUPO</Text>
          <TickerNumber value={totalARS} formatFn={formatARS} style={styles.totalAmount} />
          {hasUSD ? <Text style={styles.totalNote}>Incluye conversiones USD → ARS</Text> : null}
        </View>
        <Text style={styles.groupMeta}>
          {group.members.length} personas · {group.expenses.length} gastos
        </Text>
      </View>

      <View style={styles.membersCard}>
        <Text style={styles.sectionTag}>PARTICIPANTES</Text>
        <View style={styles.membersGrid}>
          {visibleMembers.map((member) => (
            <View key={member.id} style={styles.memberCell}>
              <MemberAvatar
                name={member.name}
                color={member.color}
                size="sm"
                isCurrentUser={isCurrentUserName(profile, member.name)}
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {member.name}
              </Text>
              <TickerNumber
                value={Math.abs(member.balance)}
                formatFn={formatARS}
                style={[
                  styles.memberBalance,
                  member.balance > 0
                    ? styles.balancePositive
                    : member.balance < 0
                      ? styles.balanceNegative
                      : styles.balanceZero,
                ]}
              />
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
              <Text style={styles.overflowLabel}>+{overflowCount} más</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAddMemberVisible(true);
          }}
          style={styles.addMemberButton}
        >
          <Text style={styles.addMemberBarLabel}>+ Agregar participante</Text>
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.sectionTag}>TE DEBEN / DEBÉS</Text>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void refreshDolarRate();
            }}
            style={styles.ratePill}
          >
            <Text style={styles.ratePillLabel}>Blue hoy: ${Math.round(dolarRate?.venta ?? 0)}</Text>
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
                  <Text style={styles.debtName}>{settlement.from.name}</Text>
                  <Text style={styles.debtSubtitle}>le debe a {settlement.to.name}</Text>
                  {settlement.originalAmountUSD ? (
                    <Text style={styles.debtOriginal}>desde {formatUSD(settlement.originalAmountUSD)}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.debtRight}>
                <TickerNumber value={settlement.amount} formatFn={formatARS} style={styles.debtAmount} />
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
      </View>

      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('expenses');
          }}
          style={[styles.segmentButton, viewMode === 'expenses' && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentLabel, viewMode === 'expenses' && styles.segmentLabelActive]}>
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
          <Text style={[styles.segmentLabel, viewMode === 'settled' && styles.segmentLabelActive]}>
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
              <Text style={styles.sectionHeaderLabel}>{section.label}</Text>
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
                  <Text style={styles.settledTitle}>
                    {from?.name ?? 'Alguien'} le pagó a {to?.name ?? 'alguien'}
                  </Text>
                  <Text style={styles.settledSubtitle}>✓ Saldado</Text>
                </View>
                <TickerNumber value={record.amount} formatFn={formatARS} style={styles.settledAmount} />
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
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <Pressable
            onLongPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSpeedDial(!speedDialOpen);
            }}
            onPress={() => setQuickAddVisible(true)}
            style={styles.fab}
          >
            <Ionicons color={theme.colors.background} name="add" size={30} />
          </Pressable>
        </Animated.View>
      </View>

      <AddMemberSheet
        visible={addMemberVisible}
        inviteCode={group.inviteCode ?? generateInviteCode()}
        onClose={() => setAddMemberVisible(false)}
        onAddMember={(name, color) => void addMember(name, color)}
      />

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
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
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
                  <TickerNumber
                    value={Math.abs(member.balance)}
                    formatFn={formatARS}
                    style={[
                      styles.modalMemberBalance,
                      member.balance > 0
                        ? styles.balancePositive
                        : member.balance < 0
                          ? styles.balanceNegative
                          : styles.balanceZero,
                    ]}
                  />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: 140,
    gap: theme.spacing.md,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  groupEmoji: {
    fontSize: 42,
  },
  groupName: {
    color: theme.colors.textPrimary,
    ...theme.typography.title1,
  },
  totalCard: {
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: 4,
  },
  sectionTag: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    ...theme.typography.caption,
    fontWeight: '500',
  },
  totalAmount: {
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  totalNote: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  groupMeta: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  membersCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberCell: {
    flexBasis: '30%',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  memberName: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
  },
  memberBalance: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  balancePositive: {
    color: '#22c55e',
  },
  balanceNegative: {
    color: '#ef4444',
  },
  balanceZero: {
    color: '#9ca3af',
  },
  overflowCell: {
    flexBasis: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  overflowLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '700',
  },
  addMemberButton: {
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: theme.spacing.sm,
  },
  addMemberBarLabel: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
    fontWeight: '600',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.card,
    height: '75%',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title2,
  },
  modalList: {
    gap: theme.spacing.sm,
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: 8,
  },
  modalMemberName: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
  modalMemberBalance: {
    ...theme.typography.callout,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  ratePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
  },
  ratePillLabel: {
    color: theme.colors.textSecondary,
    ...theme.typography.caption,
    fontWeight: '500',
  },
  emptyInline: {
    color: theme.colors.textSecondary,
    ...theme.typography.callout,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  debtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  debtCopy: {
    gap: 2,
    flex: 1,
  },
  debtName: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
  debtSubtitle: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  debtOriginal: {
    color: theme.colors.textSecondary,
    ...theme.typography.caption,
  },
  debtRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  debtAmount: {
    color: theme.colors.accent,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  segmentWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.cardSecondary,
  },
  segmentLabel: {
    color: '#8E8E93',
    ...theme.typography.footnote,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: '#F5F5F0',
  },
  sectionListContent: {
    gap: theme.spacing.sm,
  },
  receiptsBlock: {
    gap: theme.spacing.sm,
  },
  receiptsList: {
    gap: theme.spacing.sm,
  },
  receiptThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.card,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeaderLabel: {
    paddingTop: 16,
    paddingBottom: 6,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  expenseRow: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
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
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  expenseMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  expenseNote: {
    color: theme.colors.textTertiary,
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
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  expenseAmountSecondary: {
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.danger,
    borderTopRightRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  settledList: {
    gap: theme.spacing.sm,
  },
  settledRow: {
    minHeight: 64,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settledCopy: {
    gap: 4,
    flex: 1,
  },
  settledTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
  },
  settledSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  settledAmount: {
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.textPrimary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  speedDialOption: {
    position: 'absolute',
    right: theme.spacing.md,
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedDialLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    fontWeight: '600',
  },
});
