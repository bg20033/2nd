import { type PersonGenderValue } from '../constants/app-enums';
import type { QuestionAnswerRow } from './health-declaration-submission';
import type { LocationFilterResponse } from './location.service';

export type PersonGender = PersonGenderValue;
export type ReviewPersonScope = 'all' | string;
export type ReviewRiskCategory = 'medical' | 'dental' | 'lifestyle' | 'insurance' | 'demographic' | 'financial';
export type ReviewRiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReviewRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReviewCategoryScores = Record<ReviewRiskCategory, number>;

export type ReviewRiskDriver = {
  id: string;
  rank: number;
  category: ReviewRiskCategory;
  questionPath: string;
  questionLabel: string;
  answerLabel: string;
  points: number;
  severity: ReviewRiskSeverity;
  explanation: string;
  personId?: string;
  personLabel?: string;
};

export type ReviewDashboardPerson = {
  id: string;
  label: string;
  gender: PersonGender;
  birthYear: string;
  age: number | null;
  healthScore: number;
  riskScore: number;
  rawRiskPoints: number;
  riskLevel: ReviewRiskLevel;
  estimatedMonthlyMinChf: number;
  estimatedMonthlyMaxChf: number;
  estimatedMonthlyLabel: string;
  positiveAnswers: number;
  diagnosisCount: number;
  dentalLoad: number;
  categoryScores: ReviewCategoryScores;
  riskDrivers: ReviewRiskDriver[];
  topDrivers: ReviewRiskDriver[];
  answers: QuestionAnswerRow[];
};

export type ReviewDashboard = {
  generatedAt: string;
  recipientEmail: string;
  scope: ReviewPersonScope;
  familyLocation: LocationFilterResponse | null;
  people: ReviewDashboardPerson[];
  totals: {
    people: number;
    averageHealthScore: number;
    averageRiskScore: number;
    averageDentalLoad: number;
    rawRiskPoints: number;
    monthlyMinChf: number;
    monthlyMaxChf: number;
    monthlyLabel: string;
    categoryScores: ReviewCategoryScores;
    topDrivers: ReviewRiskDriver[];
  };
};

export type ReviewPersonSnapshot = {
  id?: string;
  completed?: boolean;
  gender?: PersonGender;
  birthYear?: string;
  questionnaire?: unknown;
};
