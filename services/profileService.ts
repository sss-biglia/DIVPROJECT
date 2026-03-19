import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserProfile } from '../types';

const PROFILE_KEY = 'splitsnap_profile';
const ONBOARDING_KEY = 'splitsnap_onboarding_done';

export const loadProfile = async (): Promise<UserProfile | null> => {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const isOnboardingDone = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
};

export const markOnboardingDone = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
};
