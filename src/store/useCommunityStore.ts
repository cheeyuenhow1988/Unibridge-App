import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { joinIntakeGroup } from '@/services/api';
import type { GroupMessage } from '@/types/models';

export type MateLinkStatus = 'requested' | 'incoming' | 'connected' | 'blocked';

export interface MateLink {
  status: MateLinkStatus;
  /** Epoch ms when the current status was entered. */
  at: number;
}

export interface MateMessage {
  id: string;
  mine: boolean;
  text: string;
  time: string;
}

/** Mock accept delay: requests turn into connections after this long. */
export const ACCEPT_AFTER_MS = 6000;

interface CommunityState {
  joinedGroupIds: string[];
  localMessages: Record<string, GroupMessage[]>;
  /** Legacy simple list — migrated into mateLinks on load, kept for old data. */
  connections: string[];
  mateLinks: Record<string, MateLink>;
  mateMessages: Record<string, MateMessage[]>;
  rsvps: string[];
  likedPostIds: string[];
  joinGroup: (id: string) => void;
  leaveGroup: (id: string) => void;
  sendMessage: (groupId: string, text: string, author: string) => void;
  /** One-time demo seed of incoming friend requests. */
  incomingSeeded: boolean;
  /** Send a connection request (no-op if any link already exists). */
  requestConnect: (mateId: string) => void;
  /** Flip due requests to connected; returns the mate ids that just accepted. */
  settleRequests: () => string[];
  /** Mark these mates as having sent ME a friend request (prototype). */
  seedIncoming: (mateIds: string[]) => void;
  acceptRequest: (mateId: string) => void;
  declineRequest: (mateId: string) => void;
  unfriend: (mateId: string) => void;
  block: (mateId: string) => void;
  unblock: (mateId: string) => void;
  sendMateMessage: (mateId: string, text: string, mine: boolean) => void;
  deleteMateChat: (mateId: string) => void;
  toggleRsvp: (eventId: string) => void;
  toggleLike: (postId: string) => void;
  seed: (joinedGroupIds: string[]) => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      joinedGroupIds: [],
      localMessages: {},
      connections: [],
      mateLinks: {},
      mateMessages: {},
      rsvps: [],
      likedPostIds: [],
      joinGroup: (id) => {
        set((s) => ({ joinedGroupIds: s.joinedGroupIds.includes(id) ? s.joinedGroupIds : [...s.joinedGroupIds, id] }));
        void joinIntakeGroup(id); // membership row on the backend (no-op unconfigured)
      },
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
      incomingSeeded: false,
      requestConnect: (id) =>
        set((s) => (s.mateLinks[id] ? s : { mateLinks: { ...s.mateLinks, [id]: { status: 'requested', at: Date.now() } } })),
      seedIncoming: (ids) =>
        set((s) => ({
          incomingSeeded: true,
          mateLinks: {
            ...s.mateLinks,
            ...Object.fromEntries(
              ids.filter((id) => !s.mateLinks[id]).map((id) => [id, { status: 'incoming' as const, at: Date.now() }]),
            ),
          },
        })),
      acceptRequest: (id) =>
        set((s) =>
          s.mateLinks[id]?.status === 'incoming'
            ? { mateLinks: { ...s.mateLinks, [id]: { status: 'connected', at: Date.now() } } }
            : s,
        ),
      declineRequest: (id) =>
        set((s) => {
          if (s.mateLinks[id]?.status !== 'incoming') return s;
          const { [id]: _gone, ...rest } = s.mateLinks;
          return { mateLinks: rest };
        }),
      settleRequests: () => {
        const now = Date.now();
        const due = Object.entries(get().mateLinks)
          .filter(([, l]) => l.status === 'requested' && now - l.at >= ACCEPT_AFTER_MS)
          .map(([id]) => id);
        if (due.length > 0) {
          set((s) => ({
            mateLinks: Object.fromEntries(
              Object.entries(s.mateLinks).map(([id, l]) =>
                due.includes(id) ? [id, { status: 'connected' as const, at: now }] : [id, l],
              ),
            ),
          }));
        }
        return due;
      },
      unfriend: (id) =>
        set((s) => {
          const { [id]: _gone, ...rest } = s.mateLinks;
          const { [id]: _msgs, ...restMsgs } = s.mateMessages;
          return { mateLinks: rest, mateMessages: restMsgs };
        }),
      block: (id) =>
        set((s) => {
          const { [id]: _msgs, ...restMsgs } = s.mateMessages;
          return { mateLinks: { ...s.mateLinks, [id]: { status: 'blocked', at: Date.now() } }, mateMessages: restMsgs };
        }),
      unblock: (id) =>
        set((s) => {
          const { [id]: _gone, ...rest } = s.mateLinks;
          return { mateLinks: rest };
        }),
      sendMateMessage: (id, text, mine) =>
        set((s) => ({
          mateMessages: {
            ...s.mateMessages,
            [id]: [
              ...(s.mateMessages[id] ?? []),
              { id: `mm-${Date.now()}-${mine ? 'a' : 'b'}`, mine, text, time: new Date().toISOString() },
            ],
          },
        })),
      deleteMateChat: (id) =>
        set((s) => {
          const { [id]: _msgs, ...restMsgs } = s.mateMessages;
          return { mateMessages: restMsgs };
        }),
      toggleRsvp: (id) => set((s) => ({ rsvps: toggle(s.rsvps, id) })),
      toggleLike: (id) => set((s) => ({ likedPostIds: toggle(s.likedPostIds, id) })),
      seed: (joinedGroupIds) => set({ joinedGroupIds }),
    }),
    {
      name: 'ub-community',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 stored plain connected ids in `connections` — carry them over.
      migrate: (persisted: unknown, version) => {
        const state = persisted as Partial<CommunityState>;
        if (version === 0 && state?.connections?.length && !Object.keys(state.mateLinks ?? {}).length) {
          state.mateLinks = Object.fromEntries(
            state.connections.map((id) => [id, { status: 'connected' as const, at: 0 }]),
          );
        }
        return state as CommunityState;
      },
    },
  ),
);
