import { Group, Member, SettlementRecord } from '../types';
import { roundCurrency } from './format';

export interface MemberBalance {
  member: Member;
  net: number;
  paid: number;
  owed: number;
}

export interface SettlementSuggestion {
  from: Member;
  to: Member;
  amount: number;
}

const applySettlementToNet = (
  netByMemberId: Record<string, number>,
  settlement: SettlementRecord
) => {
  netByMemberId[settlement.fromMemberId] = roundCurrency(
    (netByMemberId[settlement.fromMemberId] ?? 0) + settlement.amount
  );
  netByMemberId[settlement.toMemberId] = roundCurrency(
    (netByMemberId[settlement.toMemberId] ?? 0) - settlement.amount
  );
};

export const getMemberBalances = (group: Group): MemberBalance[] => {
  const netByMemberId: Record<string, number> = {};
  const paidByMemberId: Record<string, number> = {};
  const owedByMemberId: Record<string, number> = {};

  group.members.forEach((member) => {
    netByMemberId[member.id] = 0;
    paidByMemberId[member.id] = 0;
    owedByMemberId[member.id] = 0;
  });

  group.expenses.forEach((expense) => {
    netByMemberId[expense.paidById] = roundCurrency(
      (netByMemberId[expense.paidById] ?? 0) + expense.amount
    );
    paidByMemberId[expense.paidById] = roundCurrency(
      (paidByMemberId[expense.paidById] ?? 0) + expense.amount
    );

    expense.splits.forEach((split) => {
      netByMemberId[split.memberId] = roundCurrency(
        (netByMemberId[split.memberId] ?? 0) - split.amount
      );
      owedByMemberId[split.memberId] = roundCurrency(
        (owedByMemberId[split.memberId] ?? 0) + split.amount
      );
    });
  });

  group.settlements?.forEach((settlement) => {
    applySettlementToNet(netByMemberId, settlement);
  });

  return group.members.map((member) => ({
    member,
    net: roundCurrency(netByMemberId[member.id] ?? 0),
    paid: roundCurrency(paidByMemberId[member.id] ?? 0),
    owed: roundCurrency(owedByMemberId[member.id] ?? 0),
  }));
};

export const simplifySettlements = (group: Group): SettlementSuggestion[] => {
  const balances = getMemberBalances(group)
    .map((entry) => ({ ...entry, remaining: entry.net }))
    .sort((left, right) => left.remaining - right.remaining);

  const debtors = balances
    .filter((entry) => entry.remaining < -0.009)
    .map((entry) => ({ member: entry.member, amount: Math.abs(entry.remaining) }));
  const creditors = balances
    .filter((entry) => entry.remaining > 0.009)
    .map((entry) => ({ member: entry.member, amount: entry.remaining }));

  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundCurrency(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      suggestions.push({
        from: debtor.member,
        to: creditor.member,
        amount,
      });
    }

    debtor.amount = roundCurrency(debtor.amount - amount);
    creditor.amount = roundCurrency(creditor.amount - amount);

    if (debtor.amount <= 0.009) {
      debtorIndex += 1;
    }

    if (creditor.amount <= 0.009) {
      creditorIndex += 1;
    }
  }

  return suggestions;
};

export const getGroupTotalSpent = (group: Group) =>
  roundCurrency(group.expenses.reduce((sum, expense) => sum + expense.amount, 0));
