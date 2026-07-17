import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  userProfiles: 'AKL_USER_PROFILES',
  currentProfile: 'AKL_CURRENT_PROFILE',
  drafts: 'AKL_WORKBOOK_DRAFTS',
  completedWorkbooks: 'AKL_COMPLETED_WORKBOOKS',
  legacyDrafts: 'akademika:drafts',
};

export const getJson = async (key, fallback) => {
  const value = await AsyncStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
};

export const setJson = async (key, value) => AsyncStorage.setItem(key, JSON.stringify(value));
export const removeKey = async (key) => AsyncStorage.removeItem(key);

export const getProfiles = () => getJson(storageKeys.userProfiles, []);
export const setProfiles = (profiles) => setJson(storageKeys.userProfiles, profiles);

export const getProfileByEmail = async (email) => {
  const profiles = await getProfiles();
  const normalizedEmail = email.trim().toLowerCase();
  return profiles.find((profile) => profile.email?.trim().toLowerCase() === normalizedEmail) || null;
};

export const getProfileByMobile = async (mobile) => {
  const profiles = await getProfiles();
  const normalizedMobile = mobile.trim();
  return profiles.find((profile) => profile.mobile?.trim() === normalizedMobile) || null;
};

export const getProfileByLogin = async (login) => {
  const profiles = await getProfiles();
  const value = login.trim().toLowerCase();
  return profiles.find((profile) => profile.email?.trim().toLowerCase() === value || profile.mobile?.trim() === login.trim()) || null;
};

export const saveProfile = async (profile) => {
  const profiles = await getProfiles();
  const email = profile.email.trim().toLowerCase();
  const mobile = profile.mobile.trim();
  const nextProfiles = [
    ...profiles.filter((item) => item.email?.trim().toLowerCase() !== email && item.mobile?.trim() !== mobile),
    profile,
  ];
  await setProfiles(nextProfiles);
  await setCurrentUser(profile);
  return profile;
};

export const getCurrentUser = () => getJson(storageKeys.currentProfile, null);
export const setCurrentUser = (profile) => setJson(storageKeys.currentProfile, profile);
export const clearCurrentUser = () => removeKey(storageKeys.currentProfile);

export const getDrafts = async () => {
  const drafts = await getJson(storageKeys.drafts, null);
  if (drafts) return drafts;
  return getJson(storageKeys.legacyDrafts, []);
};
export const setDrafts = (drafts) => setJson(storageKeys.drafts, drafts);
export const getCompletedWorkbooks = () => getJson(storageKeys.completedWorkbooks, []);
export const setCompletedWorkbooks = (workbooks) => setJson(storageKeys.completedWorkbooks, workbooks);
