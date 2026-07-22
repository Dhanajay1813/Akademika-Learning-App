import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_TUTORIAL_VERSION, TUTORIAL_STATUS, WHATS_NEW_VERSION } from '../config/tutorialConfig';

function safeUserKey(userId, isGuest = false) {
  const fallback = isGuest ? 'guest:unknown' : 'user:unknown';
  const raw = String(userId || fallback).trim() || fallback;
  const prefix = isGuest && !raw.startsWith('guest:') ? `guest:${raw}` : raw;
  return prefix.replace(/[^a-zA-Z0-9:_@.-]+/g, '_');
}

function tutorialKey(userId, isGuest) {
  return `akademika:tutorial:${safeUserKey(userId, isGuest)}:v${APP_TUTORIAL_VERSION}`;
}

function whatsNewKey(userId, isGuest) {
  return `akademika:whats-new:${safeUserKey(userId, isGuest)}:v${WHATS_NEW_VERSION}`;
}

async function readState(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return { version: APP_TUTORIAL_VERSION, status: TUTORIAL_STATUS.NOT_STARTED };
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object'
      ? parsed
      : { version: APP_TUTORIAL_VERSION, status: TUTORIAL_STATUS.NOT_STARTED };
  } catch (error) {
    return { version: APP_TUTORIAL_VERSION, status: TUTORIAL_STATUS.NOT_STARTED };
  }
}

async function writeTutorialState(userId, isGuest, status) {
  const timestamp = new Date().toISOString();
  const state = { version: APP_TUTORIAL_VERSION, status };
  if (status === TUTORIAL_STATUS.COMPLETED) state.completedAt = timestamp;
  if (status === TUTORIAL_STATUS.DISMISSED) state.dismissedAt = timestamp;
  if (status === TUTORIAL_STATUS.SKIPPED) state.skippedAt = timestamp;
  await AsyncStorage.setItem(tutorialKey(userId, isGuest), JSON.stringify(state));
  return state;
}

export async function getTutorialState(userId, isGuest = false) {
  return readState(tutorialKey(userId, isGuest));
}

export async function shouldShowTutorial(userId, isGuest = false) {
  const state = await getTutorialState(userId, isGuest);
  return !state?.status || state.status === TUTORIAL_STATUS.NOT_STARTED || state.status === TUTORIAL_STATUS.SKIPPED;
}

export const markTutorialCompleted = (userId, isGuest = false) => writeTutorialState(userId, isGuest, TUTORIAL_STATUS.COMPLETED);
export const markTutorialDismissed = (userId, isGuest = false) => writeTutorialState(userId, isGuest, TUTORIAL_STATUS.DISMISSED);
export const markTutorialSkipped = (userId, isGuest = false) => writeTutorialState(userId, isGuest, TUTORIAL_STATUS.SKIPPED);

export async function resetTutorialForReplay(userId, isGuest = false) {
  return getTutorialState(userId, isGuest);
}

export async function shouldShowWhatsNew(userId, isGuest = false) {
  const state = await readState(whatsNewKey(userId, isGuest));
  return state.status !== TUTORIAL_STATUS.COMPLETED || state.version !== WHATS_NEW_VERSION;
}

export async function markWhatsNewCompleted(userId, isGuest = false) {
  const state = { version: WHATS_NEW_VERSION, status: TUTORIAL_STATUS.COMPLETED, completedAt: new Date().toISOString() };
  await AsyncStorage.setItem(whatsNewKey(userId, isGuest), JSON.stringify(state));
  return state;
}
