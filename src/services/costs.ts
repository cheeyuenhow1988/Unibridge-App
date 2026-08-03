import type { CostOfLiving, Course, CurrencyCode } from '@/types/models';
import { convert } from '@/services/currency';

export interface CostBreakdown {
  currency: CurrencyCode;
  tuitionPerSemester: number;
  tuitionPerYear: number;
  tuitionTotal: number;
  livingMonthly: number;
  rentMonthly: number;
  foodMonthly: number;
  transportMonthly: number;
  insuranceTotal: number;
  visaFee: number;
  oneOffFees: number;
  /** Tuition + living + insurance + visa + one-off fees for the full course duration, local currency. */
  trueTotal: number;
  trueAnnual: number;
  durationYears: number;
}

export function costBreakdown(course: Course, col: CostOfLiving): CostBreakdown {
  const livingMonthly = col.rentMonthly + col.foodMonthly + col.transportMonthly;
  const tuitionTotal = course.tuitionPerYear * course.durationYears;
  const insuranceTotal = col.insuranceYearly * course.durationYears;
  const oneOffFees =
    course.oneOffFees.enrollment + (course.oneOffFees.lab ?? 0) + (course.oneOffFees.materials ?? 0);
  const trueTotal =
    tuitionTotal + livingMonthly * 12 * course.durationYears + insuranceTotal + col.visaFeeOneOff + oneOffFees;
  return {
    currency: course.currency,
    tuitionPerSemester: course.tuitionPerSemester,
    tuitionPerYear: course.tuitionPerYear,
    tuitionTotal,
    livingMonthly,
    rentMonthly: col.rentMonthly,
    foodMonthly: col.foodMonthly,
    transportMonthly: col.transportMonthly,
    insuranceTotal,
    visaFee: col.visaFeeOneOff,
    oneOffFees,
    trueTotal,
    trueAnnual: Math.round(trueTotal / course.durationYears),
    durationYears: course.durationYears,
  };
}

/** True annual cost converted into the given currency — used by the budget filter. */
export function trueAnnualIn(course: Course, col: CostOfLiving, currency: CurrencyCode): number {
  return convert(costBreakdown(course, col).trueAnnual, course.currency, currency);
}
