import { UserProfile } from '../types';

const normalizeValue = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

export const getProfileDisplayName = (profile: UserProfile | null) =>
  profile ? `${profile.name} ${profile.lastName}`.trim() : '';

export const isCurrentUserName = (
  profile: UserProfile | null,
  memberName: string
) => {
  if (!profile) {
    return false;
  }

  return normalizeValue(getProfileDisplayName(profile)) === normalizeValue(memberName);
};

export const getProfileInitials = (profile: UserProfile | null) => {
  if (!profile) {
    return '?';
  }

  return `${profile.name.trim().charAt(0)}${profile.lastName.trim().charAt(0)}`
    .trim()
    .toUpperCase() || '?';
};

export const getPaymentDetailsForMember = (
  profile: UserProfile | null,
  memberName: string
) => {
  if (!isCurrentUserName(profile, memberName)) {
    return {
      mpAlias: undefined,
      mpPaymentLink: undefined,
    };
  }

  return {
    mpAlias: profile?.mpAlias || undefined,
    mpPaymentLink: profile?.mpPaymentLink || undefined,
  };
};
