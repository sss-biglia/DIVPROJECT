import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { Expense, Group } from '../types';

const STORAGE_KEY = 'splitsnap_groups';

const normalizeGroup = (group: Group): Group => ({
  ...group,
  members: group.members ?? [],
  expenses: group.expenses ?? [],
  settlements: group.settlements ?? [],
});

export const loadGroups = async (): Promise<Group[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    console.log('[Storage] groups loaded:', 0);
    return [];
  }

  const groups = (JSON.parse(raw) as Group[]).map(normalizeGroup);
  console.log('[Storage] groups loaded:', groups.length);
  return groups;
};

export const saveGroups = async (groups: Group[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
};

export const addExpenseToGroup = async (
  groupId: string,
  expense: Expense
): Promise<void> => {
  const groups = await loadGroups();
  const updatedGroups = groups.map((group) =>
    group.id === groupId
      ? { ...group, expenses: [expense, ...group.expenses] }
      : group
  );

  await saveGroups(updatedGroups);
};

export const updateGroup = async (group: Group): Promise<void> => {
  const groups = await loadGroups();
  const existingIndex = groups.findIndex((item) => item.id === group.id);
  const normalized = normalizeGroup(group);

  if (existingIndex === -1) {
    groups.unshift(normalized);
    await saveGroups(groups);
    return;
  }

  groups[existingIndex] = normalized;
  await saveGroups(groups);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  const groups = await loadGroups();
  await saveGroups(groups.filter((group) => group.id !== groupId));
};

export const saveReceiptImage = async (
  groupId: string,
  expenseId: string,
  imageUri: string
): Promise<string> => {
  const baseDir = `${FileSystem.documentDirectory}splitsnap/receipts/${groupId}/`;
  const targetUri = `${baseDir}${expenseId}.jpg`;

  const dirInfo = await FileSystem.getInfoAsync(baseDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }

  await FileSystem.copyAsync({
    from: imageUri,
    to: targetUri,
  });

  return targetUri;
};
