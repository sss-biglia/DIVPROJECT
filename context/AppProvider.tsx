import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { fetchDolarBlue } from '../services/dolarService';
import { loadProfile, saveProfile } from '../services/profileService';
import { addExpenseToGroup, deleteGroup, loadGroups, saveGroups, updateGroup } from '../services/storage';
import { DolarBlueRate, Expense, ExpenseDraft, Group, SettlementRecord, UserProfile } from '../types';

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

  const refreshGroups = async () => {
    try {
      const loaded = await loadGroups();
      setGroups(loaded);
    } catch (error) {
      Alert.alert('Unable to load groups', 'Please try again in a moment.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const [loadedGroups, loadedProfile, loadedDolarRate] = await Promise.all([
          loadGroups(),
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

  const createGroup = async (group: Group) => {
    const previousGroups = groups;
    const updated = [group, ...groups];

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
    const updated = groups.some((item) => item.id === group.id)
      ? groups.map((item) => (item.id === group.id ? group : item))
      : [group, ...groups];

    setGroups(updated);

    try {
      await updateGroup(group);
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

  const saveUserProfile = async (nextProfile: UserProfile) => {
    const previousProfile = profile;
    setProfile(nextProfile);

    try {
      await saveProfile(nextProfile);
    } catch (error) {
      setProfile(previousProfile);
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
