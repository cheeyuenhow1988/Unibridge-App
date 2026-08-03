import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GroupMessage } from '@/types/models';

interface CommunityState {
  joinedGroupIds: string[];
  localMessages: Record<string, GroupMessage[]>;
  connections: string[];
  rsvps: string[];
  likedPostIds: string[];
  joinGroup: (id: string) => void;
  leaveGroup: (id: string) => void;
  sendMessage: (groupId: string, text: string, author: string) => void;
  toggleConnection: (mateId: string) => void;
  toggleRsvp: (eventId: string) => void;
  toggleLike: (postId: string) => void;
  seed: (joinedGroupIds: string[]) => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      joinedGroupIds: [],
      localMessages: {},
      connections: [],
      rsvps: [],
      likedPostIds: [],
      joinGroup: (id) =>
        set((s) => ({ joinedGroupIds: s.joinedGroupIds.includes(id) ? s.joinedGroupIds : [...s.joinedGroupIds, id] })),
      leaveGroup: (id) => set((s) => ({ joinedGroupIds: s.joinedGroupIds.filter((x) => x !== id) })),
      sendMessage: (groupId, text, author) =>
        set((s) => ({
          localMessages: {
            ...s.localMessages,
            [groupId]: [
              ...(s.localMessages[groupId] ?? []),
              {
                id: `local-${Date.now()}`,
                groupId,
                author,
                avatar: '',
                text,
                time: new Date().toISOString(),
              },
            ],
          },
        })),
      toggleConnection: (id) => set((s) => ({ connections: toggle(s.connections, id) })),
      toggleRsvp: (id) => set((s) => ({ rsvps: toggle(s.rsvps, id) })),
      toggleLike: (id) => set((s) => ({ likedPostIds: toggle(s.likedPostIds, id) })),
      seed: (joinedGroupIds) => set({ joinedGroupIds }),
    }),
    { name: 'ub-community', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
