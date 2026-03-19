import AsyncStorage from '@react-native-async-storage/async-storage';

import { DolarBlueRate } from '../types';

const CACHE_KEY = 'splitsnap_dolar_blue';
const CACHE_TTL_MS = 30 * 60 * 1000;

export const fetchDolarBlue = async (): Promise<DolarBlueRate> => {
  const cached = await AsyncStorage.getItem(CACHE_KEY);

  if (cached) {
    const parsed = JSON.parse(cached) as DolarBlueRate;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();

    if (age < CACHE_TTL_MS) {
      return parsed;
    }
  }

  const response = await fetch('https://dolarapi.com/v1/dolares/blue');

  if (!response.ok) {
    throw new Error('Could not fetch dollar rate');
  }

  const data = await response.json();
  const rate: DolarBlueRate = {
    compra: data.compra,
    venta: data.venta,
    promedio: (data.compra + data.venta) / 2,
    fetchedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rate));
  return rate;
};

export const convertUSDtoARS = (amountUSD: number, rate: DolarBlueRate): number =>
  Math.round(amountUSD * rate.venta);

export const formatARS = (amount: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
