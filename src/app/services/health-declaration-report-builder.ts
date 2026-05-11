import {
  buildReviewDashboardPerson,
  formatChfRange,
  mergeCategoryScores,
  rankDrivers,
} from './health-declaration-scoring';
import type {
  ReviewDashboard,
  ReviewPersonScope,
  ReviewPersonSnapshot,
} from './health-declaration-report.types';
import { buildQuestionAnswerFile } from './health-declaration-submission';
import type { LocationFilterResponse } from './location.service';

type TranslateParams = Record<string, string | number | null | undefined>;

export type ReportTranslateFn = (key: string, params?: TranslateParams) => string;

export type BuildReviewDashboardInput = {
  people: ReviewPersonSnapshot[];
  familyLocation: LocationFilterResponse | null;
  scope: ReviewPersonScope;
  recipientEmail: string;
  translate: ReportTranslateFn;
};

export function buildReviewDashboard({
  people,
  familyLocation,
  scope,
  recipientEmail,
  translate,
}: BuildReviewDashboardInput): ReviewDashboard {
  const generatedAt = new Date().toISOString();
  const answerRows = buildQuestionAnswerFile(generatedAt, people);
  const selectedPeople = people
    .map((person, index) => ({ person, index }))
    .filter(({ person }) => scope === 'all' || person.id === scope);
  const reports = selectedPeople.map(({ person, index }) =>
    buildReviewDashboardPerson(person, index, answerRows[index] ?? [], translate),
  );

  const averageHealthScore = average(reports.map((person) => person.healthScore));
  const averageRiskScore = average(reports.map((person) => person.riskScore));
  const averageDentalLoad = average(reports.map((person) => person.dentalLoad));
  const rawRiskPoints = reports.reduce((sum, person) => sum + person.rawRiskPoints, 0);
  const monthlyMinChf = reports.reduce((sum, person) => sum + person.estimatedMonthlyMinChf, 0);
  const monthlyMaxChf = reports.reduce((sum, person) => sum + person.estimatedMonthlyMaxChf, 0);
  const categoryScores = mergeCategoryScores(reports.map((person) => person.categoryScores));
  const topDrivers = rankDrivers(
    reports.flatMap((person) =>
      person.topDrivers.map((driver) => ({
        ...driver,
        personId: person.id,
        personLabel: person.label,
      })),
    ),
  ).slice(0, 8);

  return {
    generatedAt,
    recipientEmail,
    scope,
    familyLocation,
    people: reports,
    totals: {
      people: reports.length,
      averageHealthScore,
      averageRiskScore,
      averageDentalLoad,
      rawRiskPoints,
      monthlyMinChf,
      monthlyMaxChf,
      monthlyLabel: formatChfRange(monthlyMinChf, monthlyMaxChf, translate),
      categoryScores,
      topDrivers,
    },
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
