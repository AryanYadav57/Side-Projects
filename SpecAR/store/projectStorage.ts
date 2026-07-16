import AsyncStorage from '@react-native-async-storage/async-storage';

type PersistStorage = {
  getItem: (name: string) => string | Promise<string | null> | null;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
};

const memoryStore = new Map<string, string>();

const memoryStorage: PersistStorage = {
  getItem: (name) => memoryStore.get(name) ?? null,
  setItem: (name, value) => {
    memoryStore.set(name, value);
  },
  removeItem: (name) => {
    memoryStore.delete(name);
  },
};

const hasWindowStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isNodeRuntime =
  typeof process !== 'undefined' && Boolean(process.versions?.node);

export const projectStorage: PersistStorage =
  isNodeRuntime && !hasWindowStorage ? memoryStorage : AsyncStorage;
