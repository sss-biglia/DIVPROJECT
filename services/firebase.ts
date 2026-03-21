import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDgpbJpRg29XcWynN1_qTWl5xvZbmFhS_E',
  authDomain: 'divproject-9486f.firebaseapp.com',
  projectId: 'divproject-9486f',
  storageBucket: 'divproject-9486f.firebasestorage.app',
  messagingSenderId: '987552795471',
  appId: '1:987552795471:web:32ca4428cf0e3f2ef6533a',
};

const STORAGE_AVAILABLE_KEY = '__sak';

const getReactNativePersistence = (
  storage: typeof AsyncStorage
): Persistence => {
  class ReactNativePersistence {
    static type = 'LOCAL';
    readonly type = 'LOCAL';

    async _isAvailable() {
      try {
        await storage.setItem(STORAGE_AVAILABLE_KEY, '1');
        await storage.removeItem(STORAGE_AVAILABLE_KEY);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: unknown) {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get<T>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? (JSON.parse(json) as T) : null;
    }

    _remove(key: string) {
      return storage.removeItem(key);
    }

    _addListener() {
      return;
    }

    _removeListener() {
      return;
    }
  }

  return ReactNativePersistence as unknown as Persistence;
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
