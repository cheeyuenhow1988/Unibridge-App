import { create } from 'zustand';

interface ToastState {
  message: string | null;
  nonce: number;
  show: (message: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  nonce: 0,
  show: (message) => set((s) => ({ message, nonce: s.nonce + 1 })),
  clear: () => set({ message: null }),
}));

export const toast = (message: string) => useToastStore.getState().show(message);
