export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'drinks'
  | 'supermarket'
  | 'entertainment'
  | 'health'
  | 'other';

export const CATEGORY_META: Record<ExpenseCategory, { label: string; emoji: string }> = {
  food: { label: 'Food', emoji: '🍕' },
  transport: { label: 'Transport', emoji: '🚗' },
  accommodation: { label: 'Accommodation', emoji: '🏨' },
  drinks: { label: 'Drinks', emoji: '🍺' },
  supermarket: { label: 'Supermarket', emoji: '🛒' },
  entertainment: { label: 'Entertainment', emoji: '🎉' },
  health: { label: 'Health', emoji: '💊' },
  other: { label: 'Other', emoji: '📦' },
};

export interface DolarBlueRate {
  compra: number;
  venta: number;
  promedio: number;
  fetchedAt: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  inviteCode?: string;
  members: Member[];
  expenses: Expense[];
  settlements?: SettlementRecord[];
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  paidById: string;
  splits: Split[];
  date: string;
  receiptImageUri?: string;
  source: 'camera' | 'text' | 'manual';
  merchant?: string;
  items?: ReceiptItem[];
  note?: string;
  exchangeRateAtTime?: number;
  convertedAmountARS?: number;
  category?: ExpenseCategory;
}

export interface Split {
  memberId: string;
  amount: number;
}

export interface SettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: string;
  currency?: 'ARS' | 'USD';
  originalAmountUSD?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  lastName: string;
  avatarColor: string;
  mpAlias: string;
  mpPaymentLink: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: 'ARS' | 'USD';
  date: string;
  method: 'mercadopago' | 'cash' | 'other';
  note?: string;
}

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ExtractedExpense {
  total?: number;
  amount?: number;
  currency?: 'ARS' | 'USD';
  merchant?: string;
  date?: string;
  description?: string;
  items?: ReceiptItem[];
  category?: ExpenseCategory;
}

export interface ExpenseDraft {
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  date: string;
  merchant?: string;
  items?: ReceiptItem[];
  receiptImageUri?: string;
  source: 'camera' | 'text' | 'manual';
  groupId?: string;
  paidById?: string;
  splitMode: 'equal' | 'selected';
  selectedMemberIds: string[];
  category?: ExpenseCategory;
  exchangeRateAtTime?: number;
  convertedAmountARS?: number;
}
