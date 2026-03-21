import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { Expense, Group, Member } from '../types';
import { generateInviteCode } from '../utils/id';
import { auth, db } from './firebase';

const STORAGE_KEY = 'splitsnap_groups';
const FALLBACK_MEMBER_COLOR = '#A8B89C';

const getCurrentUid = () => auth.currentUser?.uid ?? null;

export const normalizeGroup = (group: Partial<Group>): Group => ({
  id: group.id ?? '',
  name: group.name ?? '',
  emoji: group.emoji ?? '',
  createdAt: group.createdAt ?? new Date().toISOString(),
  inviteCode: group.inviteCode,
  ownerId: group.ownerId,
  memberIds: Array.from(
    new Set([
      ...(group.memberIds ?? (group.members ?? []).map((member) => member.id)),
      ...(group.ownerId ? [group.ownerId] : []),
    ])
  ),
  updatedAt: group.updatedAt,
  members: group.members ?? [],
  expenses: group.expenses ?? [],
  settlements: group.settlements ?? [],
});

export const dedupeGroups = (groups: Group[]) =>
  Array.from(
    groups.reduce((map, group) => {
      map.set(group.id, normalizeGroup(group));
      return map;
    }, new Map<string, Group>()).values()
  );

const saveGroupsToCache = async (groups: Group[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
};

export const cacheGroupsLocally = async (groups: Group[]): Promise<void> => {
  await saveGroupsToCache(dedupeGroups(groups));
};

const replaceOrAppendGroup = (groups: Group[], nextGroup: Group) => {
  const existing = groups.some((group) => group.id === nextGroup.id);

  return existing
    ? groups.map((group) => (group.id === nextGroup.id ? nextGroup : group))
    : [...groups, nextGroup];
};

export const generateUniqueInviteCode = async (): Promise<string> => {
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const nextCode = generateInviteCode();
      const snapshot = await getDocs(
        query(collection(db, 'groups'), where('inviteCode', '==', nextCode), limit(1))
      );

      if (snapshot.empty) {
        return nextCode;
      }
    }
  } catch {
    return generateInviteCode();
  }

  return generateInviteCode();
};

export const syncGroupsToFirestore = async (groups: Group[]): Promise<void> => {
  const uid = getCurrentUid();

  if (!uid) {
    return;
  }

  const batch = writeBatch(db);
  const normalizedGroups = dedupeGroups(groups);
  const ownedGroups = normalizedGroups.filter((group) => (group.ownerId ?? uid) === uid);
  const nextOwnedGroupIds = new Set(ownedGroups.map((group) => group.id));
  const ownedSnapshot = await getDocs(
    query(collection(db, 'groups'), where('ownerId', '==', uid))
  );

  normalizedGroups.forEach((group) => {
    const ref = doc(db, 'groups', group.id);
    const memberIds = group.memberIds ?? group.members.map((member) => member.id);

    batch.set(ref, {
      ...group,
      ownerId: group.ownerId ?? uid,
      memberIds,
      updatedAt: new Date().toISOString(),
    });
  });

  ownedSnapshot.docs.forEach((doc) => {
    if (!nextOwnedGroupIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  });

  await batch.commit();
};

export const loadGroupsFromFirestore = async (): Promise<Group[]> => {
  const uid = getCurrentUid();

  if (!uid) {
    return [];
  }

  const [ownedSnapshot, memberSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'groups'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'groups'), where('memberIds', 'array-contains', uid))),
  ]);

  const groups = dedupeGroups([
    ...ownedSnapshot.docs.map((doc) => normalizeGroup(doc.data() as Group)),
    ...memberSnapshot.docs.map((doc) => normalizeGroup(doc.data() as Group)),
  ]);

  await saveGroupsToCache(groups);
  return groups;
};

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
  const normalizedGroups = dedupeGroups(groups);

  await cacheGroupsLocally(normalizedGroups);

  try {
    await syncGroupsToFirestore(normalizedGroups);
  } catch (error) {
    console.log('[Storage] groups sync failed, keeping local cache.', error);
  }
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

export const joinGroupByCode = async (code: string): Promise<Group | null> => {
  const uid = getCurrentUid();
  const normalizedCode = code.trim().toUpperCase();

  if (!uid || !normalizedCode) {
    return null;
  }

  const snapshot = await getDocs(
    query(collection(db, 'groups'), where('inviteCode', '==', normalizedCode), limit(1))
  );

  if (snapshot.empty) {
    return null;
  }

  const groupDoc = snapshot.docs[0];
  const group = normalizeGroup(groupDoc.data() as Group);
  const userDoc = await getDoc(doc(db, 'users', uid));
  const userProfile = userDoc.data();

  if (!userProfile) {
    return null;
  }

  const alreadyMember =
    group.members.some((member) => member.id === uid) ||
    (group.memberIds ?? []).includes(uid);
  const nextMemberIds = Array.from(
    new Set([...(group.memberIds ?? group.members.map((member) => member.id)), uid])
  );
  const newMember: Member = {
    id: uid,
    name: `${userProfile.name ?? ''} ${userProfile.lastName ?? ''}`.trim(),
    color: userProfile.avatarColor ?? FALLBACK_MEMBER_COLOR,
  };
  const updatedGroup = normalizeGroup({
    ...group,
    members: alreadyMember ? group.members : [...group.members, newMember],
    memberIds: nextMemberIds,
  });

  if (!alreadyMember) {
    await updateDoc(groupDoc.ref, {
      members: updatedGroup.members,
      memberIds: updatedGroup.memberIds,
    });
  }

  const localGroups = await loadGroups();
  await saveGroups(replaceOrAppendGroup(localGroups, updatedGroup));

  return updatedGroup;
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
