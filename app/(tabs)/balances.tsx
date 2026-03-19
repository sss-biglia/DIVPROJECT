import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MemberAvatar } from '../../components/MemberAvatar';
import { MPPaymentSheet } from '../../components/MPPaymentSheet';
import { TickerNumber } from '../../components/TickerNumber';
import { AppCard, EmptyState, Screen, SectionTitle } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { getMemberBalances, simplifySettlements } from '../../services/balanceService';
import { formatARS, formatUSD } from '../../services/dolarService';
import { SettlementRecord } from '../../types';
import { createId } from '../../utils/id';
import { getPaymentDetailsForMember, isCurrentUserName } from '../../utils/profile';

export default function BalancesScreen() {
  const { groups, addSettlement, profile } = useApp();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedDebt, setSelectedDebt] = useState<{
    groupId: string;
    fromMemberId: string;
    toMemberId: string;
    memberName: string;
    amount: number;
    currency: 'ARS' | 'USD';
    color?: string;
    mpAlias?: string;
    mpPaymentLink?: string;
    originalAmountUSD?: number;
  } | null>(null);

  const globalTotals = Object.values(
    groups.reduce<Record<string, { name: string; total: number; color: string }>>(
      (accumulator, group) => {
        const balances = getMemberBalances(group);

        balances.forEach((balance) => {
          const key = balance.member.name.trim().toLowerCase();

          if (!accumulator[key]) {
            accumulator[key] = {
              name: balance.member.name,
              total: 0,
              color: balance.member.color,
            };
          }

          accumulator[key].total += balance.net;
        });

        return accumulator;
      },
      {}
    )
  ).sort((left, right) => right.total - left.total);

  const onSettle = async () => {
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

      await addSettlement(selectedDebt.groupId, settlement);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedDebt(null);
    } catch (error) {
      Alert.alert('No pudimos saldar', 'Probá de nuevo.');
    }
  };

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <SectionTitle
        title="Saldos"
        subtitle="Todo lo pendiente en un solo lugar, siempre expresado en pesos."
      />

      <AppCard style={styles.totalCard}>
        <Text style={styles.sectionLabel}>BALANCE GLOBAL</Text>
        {globalTotals.length === 0 ? (
          <Text style={styles.emptyInline}>Todavía no hay balances para mostrar.</Text>
        ) : (
          globalTotals.map((item) => {
            const positive = item.total >= 0;

            return (
              <View key={item.name} style={styles.balanceRow}>
                <View style={styles.balanceLeft}>
                  <MemberAvatar
                    name={item.name}
                    color={item.color}
                    size="sm"
                    isCurrentUser={isCurrentUserName(profile, item.name)}
                  />
                  <View>
                    <Text style={styles.balanceName}>{item.name}</Text>
                    <Text style={styles.balanceHint}>{positive ? 'TE DEBEN' : 'DEBÉS'}</Text>
                  </View>
                </View>
                <TickerNumber
                  value={Math.abs(item.total)}
                  formatFn={formatARS}
                  style={[styles.balanceValue, !positive && styles.balanceValueNegative]}
                />
              </View>
            );
          })
        )}
      </AppCard>

      {groups.length === 0 ? (
        <EmptyState
          title="No hay saldos todavía"
          message="Creá un grupo y cargá algunos gastos para empezar a ver quién le debe a quién."
        />
      ) : (
        groups.map((group) => {
          const activeSettlements = simplifySettlements(group);
          const settledRecords = [...(group.settlements ?? [])].sort((left, right) =>
            right.date.localeCompare(left.date)
          );
          const isExpanded = !!expandedGroups[group.id];

          return (
            <AppCard key={group.id} style={styles.groupCard}>
              <Text style={styles.groupTitle}>
                {group.emoji} {group.name}
              </Text>

              {activeSettlements.length === 0 ? (
                <Text style={styles.emptyInline}>Todo está saldado en este grupo.</Text>
              ) : (
                activeSettlements.map((settlement) => (
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
                          <Text style={styles.usdHint}>desde {formatUSD(settlement.originalAmountUSD)}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.debtRight}>
                      <TickerNumber value={settlement.amount} formatFn={formatARS} style={styles.debtAmount} />
                      <Pressable
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const paymentDetails = getPaymentDetailsForMember(profile, settlement.to.name);

                          setSelectedDebt({
                            groupId: group.id,
                            fromMemberId: settlement.from.id,
                            toMemberId: settlement.to.id,
                            memberName: settlement.to.name,
                            amount: settlement.amount,
                            currency: 'ARS',
                            color: settlement.to.color,
                            originalAmountUSD: settlement.originalAmountUSD,
                            ...paymentDetails,
                          });
                        }}
                        style={styles.payButton}
                      >
                        <Text style={styles.payButtonLabel}>Pagar 💸</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedGroups((current) => ({
                    ...current,
                    [group.id]: !current[group.id],
                  }));
                }}
                style={styles.collapsibleHeader}
              >
                <Text style={styles.collapsibleTitle}>Saldados ({settledRecords.length})</Text>
                <Ionicons
                  color={theme.colors.textSecondary}
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                />
              </Pressable>

              {isExpanded ? (
                settledRecords.length === 0 ? (
                  <Text style={styles.emptyInline}>Todavía no hay pagos saldados.</Text>
                ) : (
                  settledRecords.map((record) => {
                    const from = group.members.find((member) => member.id === record.fromMemberId);
                    const to = group.members.find((member) => member.id === record.toMemberId);

                    return (
                      <View key={record.id} style={styles.settledRow}>
                        <View style={styles.debtLeft}>
                          <MemberAvatar
                            name={from?.name ?? '??'}
                            color={from?.color ?? '#333333'}
                            size="sm"
                            isCurrentUser={isCurrentUserName(profile, from?.name ?? '')}
                          />
                          <View style={styles.debtCopy}>
                            <Text style={styles.settledText}>
                              {from?.name ?? 'Alguien'} le pagó a {to?.name ?? 'alguien'}
                            </Text>
                            <Text style={styles.settledBadge}>✓ Saldado</Text>
                          </View>
                        </View>
                        <TickerNumber value={record.amount} formatFn={formatARS} style={styles.settledAmount} />
                      </View>
                    );
                  })
                )
              ) : null}
            </AppCard>
          );
        })
      )}

      <MPPaymentSheet
        visible={!!selectedDebt}
        onClose={() => setSelectedDebt(null)}
        onSettle={() => void onSettle()}
        memberName={selectedDebt?.memberName ?? ''}
        amount={selectedDebt?.amount ?? 0}
        currency="ARS"
        mpAlias={selectedDebt?.mpAlias}
        mpPaymentLink={selectedDebt?.mpPaymentLink}
        originalAmountUSD={selectedDebt?.originalAmountUSD}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
  },
  totalCard: {
    borderColor: theme.colors.accentBorder,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    ...theme.typography.caption,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: 4,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  balanceName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  balanceHint: {
    color: theme.colors.textSecondary,
    ...theme.typography.caption,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  balanceValueNegative: {
    color: theme.colors.textPrimary,
  },
  emptyInline: {
    color: theme.colors.textSecondary,
    ...theme.typography.callout,
  },
  groupCard: {
    borderColor: theme.colors.accentBorder,
  },
  groupTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title3,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: 6,
  },
  debtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  debtCopy: {
    flex: 1,
    gap: 2,
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
  usdHint: {
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
    letterSpacing: -0.25,
  },
  payButton: {
    minHeight: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonLabel: {
    color: '#1A2018',
    fontSize: 13,
    fontWeight: '600',
  },
  collapsibleHeader: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.footnote,
    fontWeight: '600',
  },
  settledRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  settledText: {
    color: theme.colors.textTertiary,
    ...theme.typography.footnote,
  },
  settledBadge: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  settledAmount: {
    color: theme.colors.textTertiary,
    fontSize: 15,
    fontWeight: '600',
  },
});
