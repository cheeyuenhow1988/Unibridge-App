import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DocumentTypeId, VaultDocument } from '@/types/models';

interface VaultState {
  documents: VaultDocument[];
  addDocument: (doc: Omit<VaultDocument, 'id' | 'uploadedAt'>) => void;
  removeDocument: (id: string) => void;
  setExpiry: (id: string, expiryDate: string | undefined) => void;
  hasType: (type: DocumentTypeId) => boolean;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      documents: [],
      addDocument: (doc) =>
        set((s) => ({
          documents: [
            // one live document per type keeps the checklist logic simple
            ...s.documents.filter((d) => d.type !== doc.type),
            {
              ...doc,
              id: `doc-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
              uploadedAt: new Date().toISOString(),
            },
          ],
        })),
      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      setExpiry: (id, expiryDate) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, expiryDate } : d)),
        })),
      hasType: (type) => get().documents.some((d) => d.type === type),
    }),
    { name: 'ub-vault', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
