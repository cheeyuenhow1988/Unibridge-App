import { useMemo } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { listCostOfLiving, listCourses, listInstitutions, getQualificationSystems } from '@/services/api';
import { matchAll } from '@/services/eligibility';
import { useProfileStore } from '@/store/useProfileStore';
import type { CostOfLiving, MatchResult } from '@/types/models';

export interface MatchData {
  results: MatchResult[];
  resultByCourseId: Map<string, MatchResult>;
  colByCity: Map<string, CostOfLiving>;
}

/** Loads the full catalogue once and evaluates it against the current profile. */
export function useMatchData() {
  const profile = useProfileStore((s) => s.profile);
  const state = useAsync(
    async () =>
      Promise.all([listCourses(), listInstitutions(), getQualificationSystems(), listCostOfLiving()]),
    [],
  );

  const data: MatchData | null = useMemo(() => {
    if (!state.data || !profile) return null;
    const [courses, institutions, systems, col] = state.data;
    const results = matchAll(profile, courses, institutions, systems);
    return {
      results,
      resultByCourseId: new Map(results.map((r) => [r.course.id, r])),
      colByCity: new Map(col.map((c) => [c.city, c])),
    };
  }, [state.data, profile]);

  return { ...state, matchData: data, profile };
}
