import { formatARS, formatUSD } from '../services/dolarService';

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatCurrency = (currency: 'ARS' | 'USD' | undefined, amount: number) =>
  currency === 'USD' ? formatUSD(amount) : formatARS(amount);

export const formatShortDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};
