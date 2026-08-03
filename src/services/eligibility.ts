import type {
  Course, GradesInput, Institution, MatchResult, MatchStatus, QualificationSystem, StudentProfile,
} from '@/types/models';

/** Collapse a grade entry (subject rows or a single total) into one score on the system's scale. */
export function computeScore(grades: GradesInput, system: QualificationSystem): number | null {
  if (system.mode === 'total') {
    return typeof grades.total === 'number' ? grades.total : null;
  }
  const rows = grades.subjects ?? [];
  if (rows.length === 0 || !system.grades) return null;
  const points = rows
    .map((r) => system.grades!.find((g) => g.label === r.grade)?.points)
    .filter((p): p is number => typeof p === 'number');
  if (points.length === 0) return null;

  if (system.aggregator === 'credits') {
    return points.filter((p) => p >= (system.creditMinPoints ?? 0)).length;
  }
  const sorted = [...points].sort((a, b) => (system.direction === 'lower' ? a - b : b - a));
  const best = sorted.slice(0, system.bestOf ?? sorted.length);
  const sum = best.reduce((a, b) => a + b, 0);
  return system.aggregator === 'mean' ? sum / best.length : sum;
}

function academicCheck(score: number, min: number, system: QualificationSystem) {
  const met = system.direction === 'lower' ? score <= min : score >= min;
  const borderline = !met && (
    system.direction === 'lower'
      ? score <= min + system.borderlineDelta
      : score >= min - system.borderlineDelta
  );
  return { met, borderline };
}

const IELTS_TO_TOEFL: Record<string, number> = { '5': 45, '5.5': 55, '6': 72, '6.5': 85, '7': 95 };

function englishCheck(profile: StudentProfile, course: Course, isLocal: boolean) {
  if (isLocal) return { ok: true, missing: false };
  const { test, score } = profile.english;
  if (test === 'none' || typeof score !== 'number') return { ok: false, missing: true };
  const required = test === 'ielts' ? course.english.ielts : course.english.toefl;
  return { ok: score >= required, missing: false };
}

export function evaluateCourse(
  profile: StudentProfile,
  course: Course,
  institution: Institution,
  system: QualificationSystem,
): MatchResult {
  const isLocal = profile.nationality === course.country;
  const score = computeScore(profile.grades, system) ?? 0;
  const requirement = course.requirements[system.id];
  const academic = academicCheck(score, requirement.min, system);
  const english = englishCheck(profile, course, isLocal);

  let status: MatchStatus;
  if (academic.met && english.ok) status = 'eligible';
  else if (academic.met || academic.borderline) status = 'borderline';
  else status = 'pathway';

  const reasons: MatchResult['reasons'] = [];
  if (!academic.met && academic.borderline) {
    reasons.push({ key: 'match.reason.academicBorderline', params: { req: requirement.display } });
  }
  if (!academic.met && !academic.borderline) {
    reasons.push({ key: 'match.reason.academicBelow', params: { req: requirement.display } });
  }
  if (english.missing) {
    reasons.push({ key: 'match.reason.englishMissing', params: { ielts: course.english.ielts } });
  } else if (!english.ok) {
    reasons.push({ key: 'match.reason.englishLow', params: { ielts: course.english.ielts } });
  }
  if (isLocal) reasons.push({ key: 'match.reason.localWaived' });

  return {
    course,
    institution,
    status,
    academicOk: academic.met,
    academicBorderline: academic.borderline,
    englishOk: english.ok,
    englishMissing: english.missing,
    isLocal,
    score,
    requirement,
    reasons,
    recognizedAtHome: course.recognition[profile.homeCountry] ?? false,
  };
}

export function matchAll(
  profile: StudentProfile,
  courses: Course[],
  institutions: Institution[],
  systems: QualificationSystem[],
): MatchResult[] {
  const system = systems.find((s) => s.id === profile.qualification);
  if (!system) return [];
  const instById = new Map(institutions.map((i) => [i.id, i]));
  return courses
    .map((c) => {
      const inst = instById.get(c.institutionId);
      return inst ? evaluateCourse(profile, c, inst, system) : null;
    })
    .filter((r): r is MatchResult => r !== null);
}

/**
 * Profile-strength insight: how many extra courses would flip to fully eligible
 * if the student presented the given IELTS score.
 */
export function unlockCountWithIelts(results: MatchResult[], ielts: number): number {
  return results.filter(
    (r) => r.status === 'borderline' && r.academicOk && !r.englishOk && r.course.english.ielts <= ielts,
  ).length;
}

/** Pathway routes (foundation/diploma) that feed the given field in the same country, sorted cheap-first. */
export function pathwayRoutesFor(course: Course, all: Course[]): Course[] {
  return all
    .filter(
      (c) =>
        c.level !== 'bachelor' &&
        c.country === course.country &&
        (c.pathwayFor?.includes(course.field) ?? false),
    )
    .sort((a, b) => a.tuitionPerYear - b.tuitionPerYear)
    .slice(0, 4);
}

export { IELTS_TO_TOEFL };
