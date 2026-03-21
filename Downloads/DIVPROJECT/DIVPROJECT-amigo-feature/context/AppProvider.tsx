import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Alert } from 'react-native';

import { fetchDolarBlue } from '../services/dolarService';
import { auth, db } from '../services/firebase';
import { clearProfile, loadProfile, saveProfile, syncProfileToFirestore } from '../services/profileService';
import {
  addExpenseToGroup,
  cacheGroupsLocally,
  dedupeGroups,
  deleteGroup,
  generateUniqueInviteCode,
  joinGroupByCode as joinGroupByCodeInStorage,
  loadGroups,
  loadGroupsFromFirestore,
  normalizeGroup,
  saveGroups,
  updateGroup,
} from '../services/storage';
import { DolarBlueRate, Expense, ExpenseDraft, Group, SettlementRecord, UserProfile } from '../types';

interface JoinGroupResult {
  status: 'joined' | 'already-member' | 'not-found';
  group?: Group | null;
}

interface AppContextValue {
  groups: Group[];
  profile: UserProfile | null;
  dolarRate: DolarBlueRate | null;
  isReady: boolean;
  pendingDraft: ExpenseDraft | null;
  refreshGroups: () => Promise<void>;
  refreshDolarRate: () => Promise<void>;
  createGroup: (group: Group) => Promise<void>;
  saveExpense: (groupId: string, expense: Expense) => Promise<void>;
  saveGroup: (group: Group) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  addSettlement: (groupId: string, settlement: SettlementRecord) => Promise<void>;
  joinGroupByCode: (code: string) => Promise<JoinGroupResult>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  setPendingDraft: (draft: ExpenseDraft | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dolarRate, setDolarRate] = useState<DolarBlueRate | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ExpenseDraft | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  const prepareGroupForPersistence = async (group: Group): Promise<Group> => {
    const uid = auth.currentUser?.uid ?? null;
    const inviteCode = group.inviteCode ?? (await generateUniqueInviteCode());

    return {
      ...group,
      inviteCode,
      ownerId: group.ownerId ?? uid ?? undefined,
      memberIds: Array.from(
        new Set([...(group.memberIds ?? group.members.map((member) => member.id)), ...(uid ? [uid] : [])])
      ),
    };
  };

  const loadAvailableGroups = async (): Promise<Group[]> => {
    if (auth.currentUser) {
      try {
        return await loadGroupsFromFirestore();
      } catch {
        return loadGroups();
      }
    }

    return loadGroups();
  };

  const refreshGroups = async () => {
    try {
      const loaded = await loadAvailableGroups();
      setGroups(loaded);
    } catch (error) {
      Alert.alert('Unable to load groups', 'Please try again in a moment.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const [loadedGroups, loadedProfile, loadedDolarRate] = await Promise.all([
          loadAvailableGroups(),
          loadProfile(),
          fetchDolarBlue().catch(() => null),
        ]);

        setGroups(loadedGroups);
        setProfile(loadedProfile);
        setDolarRate(loadedDolarRate);
      } catch (error) {
        Alert.alert('Unable to load your data', 'Please try again in a moment.');
      } finally {
        setIsReady(true);
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUid) {
      return;
    }

    let ownerGroups: Group[] = [];
    let memberGroups: Group[] = [];

    const publishRemoteGroups = () => {
      const remoteGroups = dedupeGroups([...ownerGroups, ...memberGroups]);
      setGroups(remoteGroups);
      cacheGroupsLocally(remoteGroups).catch(() => {});
    };

    const unsubscribeMemberGroups = onSnapshot(
      query(collection(db, 'groups'), where('memberIds', 'array-contains', authUid)),
      (snapshot) => {
        memberGroups = snapshot.docs.map((doc) => normalizeGroup(doc.data() as Group));
        publishRemoteGroups();
      },
      (error) => {
        console.log('Firestore listener error:', error);
      }
    );

    const unsubscribeOwnedGroups = onSnapshot(
      query(collection(db, 'groups'), where('ownerId', '==', authUid)),
      (snapshot) => {
        ownerGroups = snapshot.docs.map((doc) => normalizeGroup(doc.data() as Group));
        publishRemoteGroups();
      },
      (error) => {
        console.log('Firestore owner listener error:', error);
      }
    );

    return () => {
      unsubscribeMemberGroups();
      unsubscribeOwnedGroups();
    };
  }, [authUid]);

  const createGroup = async (group: Group) => {
    const previousGroups = groups;
    const nextGroup = await prepareGroupForPersistence({
      ...group,
      inviteCode: await generateUniqueInviteCode(),
    });
    const updated = [nextGroup, ...groups];

    setGroups(updated);

    try {
      await saveGroups(updated);
    } catch (error) {
      setGroups(previousGroups);
      throw error;
    }
  };

  const saveExpenseToState = async (groupId: string, expense: Expense) => {
    const previousGroups = groups;
    const updated = groups.map((group) =>
      group.id === groupId
        ? { ...group, expenses: [expense, ...group.expenses] }
        : group
    );

    setGroups(updated);

    try {
      await addExpenseToGroup(groupId, expense);
    } catch (error) {
      setGroups(previousGroups);
      throw error;
    }
  };

  const saveGroup = async (group: Group) => {
    const previousGroups = groups;
    const nextGroup = await prepareGroupForPersistence(group);
    const updated = groups.some((item) => item.id === nextGroup.id)
      ? groups.map((item) => (item.id === nextGroup.id ? nextGroup : item))
      : [nextGroup, ...groups];

    setGroups(updated);

    try {
      await updateGroup(nextGroup);
    } catch (error) {
      setGroups(previousGroups);
      throw error;
    }
  };

  const removeGroup = async (groupId: string) => {
    const previousGroups = groups;
    const updated = groups.filter((group) => group.id !== groupId);

    setGroups(updated);

    try {
      await deleteGroup(groupId);
    } catch (error) {
      setGroups(previousGroups);
      throw error;
    }
  };

  const addSettlement = async (groupId: string, settlement: SettlementRecord) => {
    const target = groups.find((group) => group.id === groupId);

    if (!target) {
      throw new Error('Group not found.');
    }

    const nextGroup: Group = {
      ...target,
      settlements: [settlement, ...(target.settlements ?? [])],
    };

    await saveGroup(nextGroup);
  };

  const joinGroupByCode = async (code: string): Promise<JoinGroupResult> => {
    const existingGroupIds = new Set(groups.map((group) => group.id));
    const joinedGroup = await joinGroupByCodeInStorage(code);

    if (!joinedGroup) {
      return { status: 'not-found' };
    }
    setGroups((currentGroups) => dedupeGroups([...currentGroups, joinedGroup]));

    if (existingGroupIds.has(joinedGroup.id)) {
      return { status: 'already-member', group: joinedGroup };
    }

    return { status: 'joined', group: joinedGroup };
  };

  const saveUserProfile = async (nextProfile: UserProfile) => {
    const previousProfile = profile;
    setProfile(nextProfile);

    try {
      await saveProfile(nextProfile);
      await syncProfileToFirestore(nextProfile);
    } catch (error) {
      setProfile(previousProfile);

      try {
        if (previousProfile) {
          await saveProfile(previousProfile);
        } else {
          await clearProfile();
        }
      } catch {
        // Keep original save error as the surfaced failure.
      }

      throw error;
    }
  };

  const refreshDolarRate = async () => {
    const nextRate = await fetchDolarBlue();
    setDolarRate(nextRate);
  };

  const value = useMemo(
    () => ({
      groups,
      profile,
      dolarRate,
      isReady,
      pendingDraft,
      refreshGroups,
      refreshDolarRate,
      createGroup,
      saveExpense: saveExpenseToState,
      saveGroup,
      removeGroup,
      addSettlement,
      joinGroupByCode,
      saveUserProfile,
      setPendingDraft,
    }),
    [groups, profile, dolarRate, isReady, pendingDraft]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within an AppProvider.');
  }

  return context;
};
