export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();
