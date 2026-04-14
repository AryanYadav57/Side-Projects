import { create } from 'zustand';

interface AppStatusState {
  backendHealthy: boolean | null;
  backendCheckedAt: string | null;
  setBackendHealth: (healthy: boolean) => void;
}

export const useAppStatusStore = create<AppStatusState>((set) => ({
  backendHealthy: null,
  backendCheckedAt: null,
  setBackendHealth: (healthy: boolean) =>
    set({
      backendHealthy: healthy,
      backendCheckedAt: new Date().toISOString(),
    }),
}));
