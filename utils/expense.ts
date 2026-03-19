import { CATEGORY_META, Expense, ExpenseCategory, Split } from '../types';
import { roundCurrency } from './format';

export const expenseCategories = Object.keys(CATEGORY_META) as ExpenseCategory[];

export const normalizeExpenseCategory = (value?: string | null): ExpenseCategory => {
  if (!value) {
    return 'other';
  }

  const normalized = value.trim().toLowerCase();
  return expenseCategories.includes(normalized as ExpenseCategory)
    ? (normalized as ExpenseCategory)
    : 'other';
};

export const normalizeExpenseCurrency = (value?: string | null): 'ARS' | 'USD' => {
  if (!value) {
    return 'ARS';
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes('usd') ||
    normalized.includes('dollar') ||
    normalized.includes('dolar') ||
    normalized.includes('dólar')
  ) {
    return 'USD';
  }

  return 'ARS';
};

export const buildEqualSplits = (totalAmount: number, memberIds: string[]): Split[] => {
  if (memberIds.length === 0) {
    return [];
  }

  const perMember = roundCurrency(totalAmount / memberIds.length);

  return memberIds.map((memberId, index) => {
    const isLast = index === memberIds.length - 1;
    const amount = isLast
      ? roundCurrency(totalAmount - perMember * (memberIds.length - 1))
      : perMember;

    return {
      memberId,
      amount,
    };
  });
};

export const expenseHasUSDConversion = (expense: Expense) =>
  expense.currency === 'USD' && typeof expense.convertedAmountARS === 'number';
