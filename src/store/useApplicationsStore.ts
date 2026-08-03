import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { APPLICATION_TIMELINE, type Application, type ApplicationStatus } from '@/types/models';

export interface StatusNotification {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  date: string;
  read?: boolean;
}

interface ApplicationsState {
  applications: Application[];
  notifications: StatusNotification[];
  startApplication: (courseId: string, feeWaived: boolean, intake?: string, scholarshipId?: string) => Application;
  advanceStatus: (id: string) => void;
  acceptOffer: (id: string) => void;
  setPickup: (id: string, pickup: Application['pickup']) => void;
  markNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  seed: (applications: Application[], notifications: StatusNotification[]) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useApplicationsStore = create<ApplicationsState>()(
  persist(
    (set) => ({
      applications: [],
      notifications: [],
      startApplication: (courseId, feeWaived, intake, scholarshipId) => {
        const app: Application = {
          id: `app-${Date.now()}`,
          courseId,
          status: 'submitted',
          intake,
          createdAt: today(),
          updatedAt: today(),
          feeWaived,
          scholarshipId,
          history: [{ status: 'submitted', date: today() }],
        };
        set((s) => ({
          applications: [app, ...s.applications],
          notifications: [
            { id: `ntf-${Date.now()}`, applicationId: app.id, status: 'submitted', date: today() },
            ...s.notifications,
          ],
        }));
        return app;
      },
      advanceStatus: (id) =>
        set((s) => {
          const app = s.applications.find((a) => a.id === id);
          if (!app) return s;
          const idx = APPLICATION_TIMELINE.indexOf(app.status);
          if (idx < 0 || idx >= APPLICATION_TIMELINE.length - 1) return s;
          const status = APPLICATION_TIMELINE[idx + 1]!;
          return {
            applications: s.applications.map((a) =>
              a.id === id
                ? { ...a, status, updatedAt: today(), history: [...a.history, { status, date: today() }] }
                : a,
            ),
            notifications: [
              { id: `ntf-${Date.now()}`, applicationId: id, status, date: today() },
              ...s.notifications,
            ],
          };
        }),
      acceptOffer: (id) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'accepted' as const,
                  depositPaid: true,
                  updatedAt: today(),
                  history: [...a.history, { status: 'accepted' as const, date: today() }],
                }
              : a,
          ),
          notifications: [
            { id: `ntf-${Date.now()}`, applicationId: id, status: 'accepted', date: today() },
            ...s.notifications,
          ],
        })),
      setPickup: (id, pickup) =>
        set((s) => ({
          applications: s.applications.map((a) => (a.id === id ? { ...a, pickup } : a)),
        })),
      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      seed: (applications, notifications) => set({ applications, notifications }),
    }),
    { name: 'ub-applications', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
