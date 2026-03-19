import { Expense, Group, Member, SettlementRecord } from '../types';
import { roundCurrency } from '../utils/format';
import { formatARS } from './dolarService';

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
  currency: 'ARS';
  originalAmountUSD?: number;
}

const getSplitTotal = (expense: Expense) =>
  expense.splits.reduce((sum, split) => sum + split.amount, 0);

const getOriginalUsdShare = (
  expense: Expense,
  splitAmountARS: number,
  splitAmountRaw: number
) => {
  if (expense.currency !== 'USD' || expense.amount <= 0) {
    return undefined;
  }

  const splitTotal = getSplitTotal(expense);

  if (expense.convertedAmountARS && Math.abs(splitTotal - expense.convertedAmountARS) < 1) {
    return roundCurrency(expense.amount * (splitAmountARS / expense.convertedAmountARS));
  }

  if (splitTotal > 0) {
    return roundCurrency(expense.amount * (splitAmountRaw / splitTotal));
  }

  return roundCurrency(expense.amount / Math.max(expense.splits.length, 1));
};

export const getAmountInARS = (expense: Expense): number => {
  if (expense.currency === 'USD' && expense.convertedAmountARS) {
    return expense.convertedAmountARS;
  }

  return expense.amount;
};

export const getSplitAmountInARS = (expense: Expense, splitIndex: number): number => {
  const split = expense.splits[splitIndex];

  if (!split) {
    return 0;
  }

  if (expense.currency !== 'USD' || !expense.convertedAmountARS) {
    return split.amount;
  }

  const splitTotal = getSplitTotal(expense);

  if (Math.abs(splitTotal - expense.convertedAmountARS) < 1) {
    return split.amount;
  }

  if (Math.abs(splitTotal - expense.amount) < 1 && splitTotal > 0) {
    return roundCurrency(expense.convertedAmountARS * (split.amount / splitTotal));
  }

  return roundCurrency(expense.convertedAmountARS / Math.max(expense.splits.length, 1));
};

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

<<<<<<< HEAD
export const getMemberBalances = (group: any): MemberBalance[] => {
  if (!group || !group.members) return [];

=======
export const getMemberBalances = (group: Group): MemberBalance[] => {
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
  const netByMemberId: Record<string, number> = {};
  const paidByMemberId: Record<string, number> = {};
  const owedByMemberId: Record<string, number> = {};

  group.members.forEach((member) => {
    netByMemberId[member.id] = 0;
    paidByMemberId[member.id] = 0;
    owedByMemberId[member.id] = 0;
  });

  group.expenses.forEach((expense) => {
    const totalARS = getAmountInARS(expense);
    netByMemberId[expense.paidById] = roundCurrency(
      (netByMemberId[expense.paidById] ?? 0) + totalARS
    );
    paidByMemberId[expense.paidById] = roundCurrency(
      (paidByMemberId[expense.paidById] ?? 0) + totalARS
    );

    expense.splits.forEach((split, index) => {
      const splitARS = getSplitAmountInARS(expense, index);
      netByMemberId[split.memberId] = roundCurrency(
        (netByMemberId[split.memberId] ?? 0) - splitARS
      );
      owedByMemberId[split.memberId] = roundCurrency(
        (owedByMemberId[split.memberId] ?? 0) + splitARS
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

const buildUsdBuckets = (group: Group) => {
  const buckets = new Map<string, { ars: number; usd: number }>();

  group.expenses.forEach((expense) => {
    if (expense.currency !== 'USD') {
      return;
    }

    expense.splits.forEach((split, index) => {
      if (split.memberId === expense.paidById) {
        return;
      }

      const key = `${split.memberId}->${expense.paidById}`;
      const current = buckets.get(key) ?? { ars: 0, usd: 0 };
      const splitARS = getSplitAmountInARS(expense, index);
      const usdShare = getOriginalUsdShare(expense, splitARS, split.amount) ?? 0;

      current.ars = roundCurrency(current.ars + splitARS);
      current.usd = roundCurrency(current.usd + usdShare);
      buckets.set(key, current);
    });
  });

  return buckets;
};

<<<<<<< HEAD
export const simplifySettlements = (group: any): SettlementSuggestion[] => {
  if (!group || !group.members) return [];

=======
export const simplifySettlements = (group: Group): SettlementSuggestion[] => {
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
  const balances = getMemberBalances(group)
    .map((entry) => ({ ...entry, remaining: entry.net }))
    .sort((left, right) => left.remaining - right.remaining);
  const usdBuckets = buildUsdBuckets(group);

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
    const bucketKey = `${debtor.member.id}->${creditor.member.id}`;
    const bucket = usdBuckets.get(bucketKey);
    let originalAmountUSD: number | undefined;

    if (bucket && bucket.ars > 0 && bucket.usd > 0) {
      const proportion = Math.min(1, amount / bucket.ars);
      originalAmountUSD = roundCurrency(bucket.usd * proportion);
      bucket.ars = roundCurrency(bucket.ars - amount);
      bucket.usd = roundCurrency(bucket.usd - (originalAmountUSD ?? 0));
      usdBuckets.set(bucketKey, bucket);
    }

    if (amount > 0) {
      suggestions.push({
        from: debtor.member,
        to: creditor.member,
        amount,
        currency: 'ARS',
        originalAmountUSD,
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
  roundCurrency(group.expenses.reduce((sum, expense) => sum + getAmountInARS(expense), 0));

export const hasUSDExpenses = (group: Group) =>
  group.expenses.some((expense) => expense.currency === 'USD');

export const generateSummary = (group: Group, dolarRate?: number): string => {
  const lines: string[] = [];
  lines.push(`📊 *${group.name} — Resumen de gastos*`);
  lines.push(`📅 ${new Date().toLocaleDateString('es-AR')}`);
  lines.push('');

  const totalARS = getGroupTotalSpent(group);
  lines.push(`💰 *Total del grupo: ${formatARS(totalARS)}*`);
  lines.push('');
  lines.push('*Gastos por persona:*');

  group.members.forEach((member) => {
    const spent = group.expenses
      .filter((expense) => expense.paidById === member.id)
      .reduce((sum, expense) => sum + getAmountInARS(expense), 0);

    if (spent > 0) {
      lines.push(`  ${member.name}: ${formatARS(spent)}`);
    }
  });

  lines.push('');
  lines.push('*Quién le debe a quién:*');
  const settlements = simplifySettlements(group);

  if (settlements.length === 0) {
    lines.push('  Todo saldado.');
  } else {
    settlements.forEach((settlement) => {
      lines.push(
        `  ${settlement.from.name} le paga a ${settlement.to.name}: ${formatARS(settlement.amount)}`
      );
    });
  }

  if (dolarRate) {
    lines.push('');
    lines.push(`_Dólar blue: $${Math.round(dolarRate)} al momento del resumen_`);
  }

  lines.push('');
  lines.push('_Enviado desde SplitSnap 💸_');

  return lines.join('\n');
};
