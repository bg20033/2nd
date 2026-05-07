import {
  PersonGender as PersonGenderEnum,
  QuestionAnswerKey,
  QuestionnairePath,
} from '../constants/app-enums';
import { QUESTION_ANSWER_LABELS } from '../components/pages/questions/questionnaire-metadata';
import type { QuestionAnswerRow } from './health-declaration-submission';
import type {
  PersonGender,
  ReviewCategoryScores,
  ReviewDashboardPerson,
  ReviewPersonSnapshot,
  ReviewRiskCategory,
  ReviewRiskDriver,
  ReviewRiskLevel,
  ReviewRiskSeverity,
} from './health-declaration-report.types';

type TranslateParams = Record<string, string | number | null | undefined>;
type TranslateFn = (key: string, params?: TranslateParams) => string;
type OptionLike = {
  value?: unknown;
  label?: unknown;
};
type RiskDriverInput = Omit<ReviewRiskDriver, 'rank' | 'severity'>;
type YesRiskRule = {
  category: ReviewRiskCategory;
  path: string;
  points: number;
  explanation: string;
};

const RISK_CATEGORIES = [
  'medical',
  'dental',
  'lifestyle',
  'insurance',
  'demographic',
  'financial',
] as const satisfies readonly ReviewRiskCategory[];

const RISK_CATEGORY_ORDER = new Map<ReviewRiskCategory, number>(
  RISK_CATEGORIES.map((category, index) => [category, index]),
);

const YES_RISK_RULES: readonly YesRiskRule[] = [
  {
    category: 'insurance',
    path: `${QuestionnairePath.PreviousInsurance}.q1`,
    points: 18,
    explanation: 'Previous insurance review can indicate underwriting restrictions.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q4}`,
    points: 10,
    explanation: 'Recent treatment, control, or clarification increases current medical review load.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q4B}`,
    points: 6,
    explanation: 'Ongoing complaints or follow-up treatment adds open medical risk.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q5}`,
    points: 16,
    explanation: 'Medical history in the last 10 years is a strong health risk signal.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q6}`,
    points: 20,
    explanation: 'Major condition flag receives one of the highest medical weights.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q7}`,
    points: 10,
    explanation: 'Accident with surgery or long treatment adds relevant medical history.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q8}`,
    points: 10,
    explanation: 'Ambulatory or stationary intervention adds procedure-related risk.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q9}`,
    points: 14,
    explanation: 'Congenital defect or pension signal increases long-term risk.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q10}`,
    points: 12,
    explanation: 'Dental or jaw malposition increases expected dental review.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q10A}`,
    points: 10,
    explanation: 'Expected orthodontic work increases near-term dental cost risk.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q11}`,
    points: 4,
    explanation: 'Pregnancy is tracked as a low-weight timing factor.',
  },
  {
    category: 'medical',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q12}`,
    points: 10,
    explanation: 'Regular medication or supplements can indicate ongoing treatment.',
  },
  {
    category: 'lifestyle',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q13}`,
    points: 8,
    explanation: 'Lifestyle substance use adds underwriting context.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q16}`,
    points: 14,
    explanation: 'Periodontitis is a high dental risk signal.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q17}`,
    points: 12,
    explanation: 'Dental and jaw anomalies increase orthodontic and dental review.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.DentalInfo}.accidentDentalInjuries`,
    points: 8,
    explanation: 'Accident-related dental injuries add dental treatment risk.',
  },
  {
    category: 'dental',
    path: `${QuestionnairePath.DentalInfo}.dentalProceduresPlanned`,
    points: 12,
    explanation: 'Planned dental procedures increase near-term expected cost.',
  },
] as const;

const TRUTHY_RISK_RULES: readonly YesRiskRule[] = [
  {
    category: 'lifestyle',
    path: `${QuestionnairePath.Lifestyle}.nicotineUse`,
    points: 6,
    explanation: 'Nicotine use adds a lifestyle risk factor.',
  },
  {
    category: 'lifestyle',
    path: `${QuestionnairePath.Lifestyle}.alcoholUse`,
    points: 4,
    explanation: 'Alcohol use is tracked as a lower lifestyle risk factor.',
  },
  {
    category: 'lifestyle',
    path: `${QuestionnairePath.Lifestyle}.drugUse`,
    points: 10,
    explanation: 'Drug use adds a stronger lifestyle risk factor.',
  },
] as const;

export function buildReviewDashboardPerson(
  person: ReviewPersonSnapshot,
  index: number,
  answers: QuestionAnswerRow[],
  translate: TranslateFn,
): ReviewDashboardPerson {
  const questionnaire = asRecord(person.questionnaire);
  const age = ageFromBirthYear(person.birthYear);
  const riskDrivers = buildRiskDrivers(questionnaire, age, translate);
  const rawRiskPoints = riskDrivers.reduce((sum, driver) => sum + driver.points, 0);
  const riskScore = Math.min(Math.round(rawRiskPoints), 100);
  const dentalLoad = calculateDentalLoad(questionnaire);
  const estimate = estimateMonthlyChf(age, riskScore, dentalLoad);
  const diagnosisCount = asArray(questionnaire?.['diagnoses']).length;
  const positiveAnswers = countPositiveAnswers(questionnaire);

  return {
    id: person.id ?? `person-${index + 1}`,
    label: `Person ${index + 1}`,
    gender: normalizePersonGender(person.gender),
    birthYear: typeof person.birthYear === 'string' ? person.birthYear : '',
    age,
    healthScore: Math.max(0, 100 - riskScore),
    riskScore,
    rawRiskPoints,
    riskLevel: riskLevel(riskScore),
    estimatedMonthlyMinChf: estimate.min,
    estimatedMonthlyMaxChf: estimate.max,
    estimatedMonthlyLabel: formatChfRange(estimate.min, estimate.max, translate),
    positiveAnswers,
    diagnosisCount,
    dentalLoad,
    categoryScores: categoryScoresForDrivers(riskDrivers),
    riskDrivers,
    topDrivers: riskDrivers.slice(0, 8),
    answers,
  };
}

export function rankDrivers(drivers: Array<RiskDriverInput | ReviewRiskDriver>): ReviewRiskDriver[] {
  return [...drivers]
    .sort((a, b) =>
      b.points - a.points ||
      (RISK_CATEGORY_ORDER.get(a.category) ?? 99) - (RISK_CATEGORY_ORDER.get(b.category) ?? 99) ||
      a.questionPath.localeCompare(b.questionPath),
    )
    .map((driver, index) => ({
      ...driver,
      rank: index + 1,
      severity: driverSeverity(driver.points),
    }));
}

export function mergeCategoryScores(scoreGroups: ReviewCategoryScores[]): ReviewCategoryScores {
  const scores = emptyCategoryScores();
  for (const group of scoreGroups) {
    for (const category of RISK_CATEGORIES) {
      scores[category] += group[category] ?? 0;
    }
  }
  return scores;
}

export function formatChfRange(min: number, max: number, translate: TranslateFn): string {
  return `CHF ${min.toLocaleString('de-CH')} - ${max.toLocaleString('de-CH')} / ${translate('review.month')}`;
}

function buildRiskDrivers(
  questionnaire: Record<string, unknown> | null,
  age: number | null,
  translate: TranslateFn,
): ReviewRiskDriver[] {
  const diagnoses = asArray(questionnaire?.[QuestionnairePath.Diagnoses]);
  const body = asRecord(questionnaire?.['bodyMetrics']);
  const drivers: RiskDriverInput[] = [];

  for (const rule of YES_RISK_RULES) {
    const value = valueAtPath(questionnaire, rule.path);
    if (yes(value)) {
      drivers.push(riskDriver(rule, value, translate));
    }
  }

  for (const rule of TRUTHY_RISK_RULES) {
    const value = valueAtPath(questionnaire, rule.path);
    if (yes(value)) {
      drivers.push(riskDriver(rule, value, translate));
    }
  }

  diagnoses.slice(0, 4).forEach((diagnosis, index) => {
    const diagnosisRecord = asRecord(diagnosis);
    const condition = diagnosisRecord?.['condition'] ?? diagnosisRecord?.['name'] ?? '';
    drivers.push({
      id: `diagnosis-${index + 1}`,
      category: 'medical',
      questionPath: `${QuestionnairePath.Diagnoses}.${index + 1}.condition`,
      questionLabel: `Diagnosis ${index + 1}`,
      answerLabel: compactAnswer(condition || translate('review.diagnoses')),
      points: 6,
      explanation: 'Each diagnosis adds medical risk, capped after four entries.',
    });
  });

  addConditionDriver(
    drivers,
    'dental',
    `${QuestionnairePath.DentalInfo}.prosthesesCondition`,
    valueAtPath(questionnaire, `${QuestionnairePath.DentalInfo}.prosthesesCondition`),
    8,
    16,
    'Crowns, bridges, or prostheses condition changes the dental risk load.',
    translate,
  );
  addConditionDriver(
    drivers,
    'dental',
    `${QuestionnairePath.DentalInfo}.hygiene`,
    valueAtPath(questionnaire, `${QuestionnairePath.DentalInfo}.hygiene`),
    6,
    14,
    'Hygiene condition changes the dental risk load.',
    translate,
  );
  addCostDriver(
    drivers,
    'financial',
    `${QuestionnairePath.DentalInfo}.plannedDentalCost`,
    valueAtPath(questionnaire, `${QuestionnairePath.DentalInfo}.plannedDentalCost`),
    'Planned dental cost estimate directly increases the cost/risk model.',
    translate,
  );
  addCostDriver(
    drivers,
    'financial',
    `${QuestionnairePath.DentalInfo}.jawCostEstimate`,
    valueAtPath(questionnaire, `${QuestionnairePath.DentalInfo}.jawCostEstimate`),
    'Jaw or orthodontic cost estimate directly increases the cost/risk model.',
    translate,
  );
  addBmiDriver(drivers, body, translate);
  addAgeDriver(drivers, age, translate);

  return rankDrivers(drivers);
}

function calculateDentalLoad(questionnaire: Record<string, unknown> | null): number {
  const answers = asRecord(questionnaire?.[QuestionnairePath.QuestionAnswers]);
  const dental = asRecord(questionnaire?.[QuestionnairePath.DentalInfo]);
  let load = 0;

  load += yes(answers?.[QuestionAnswerKey.Q10]) ? 16 : 0;
  load += yes(answers?.[QuestionAnswerKey.Q16]) ? 18 : 0;
  load += yes(answers?.[QuestionAnswerKey.Q17]) ? 18 : 0;
  load += conditionRisk(dental?.['prosthesesCondition'], 16, 28);
  load += conditionRisk(dental?.['hygiene'], 12, 24);
  load += yes(dental?.['accidentDentalInjuries']) ? 12 : 0;
  load += yes(dental?.['dentalProceduresPlanned']) ? 18 : 0;
  load += costRisk(dental?.['plannedDentalCost']);

  return Math.min(Math.round(load), 100);
}

function riskDriver(
  rule: YesRiskRule,
  answer: unknown,
  translate: TranslateFn,
): RiskDriverInput {
  return {
    id: rule.path,
    category: rule.category,
    questionPath: rule.path,
    questionLabel: questionLabel(rule.path),
    answerLabel: answerLabel(answer, translate),
    points: rule.points,
    explanation: rule.explanation,
  };
}

function addConditionDriver(
  drivers: RiskDriverInput[],
  category: ReviewRiskCategory,
  questionPath: string,
  value: unknown,
  medium: number,
  poor: number,
  explanation: string,
  translate: TranslateFn,
): void {
  const points = conditionRisk(value, medium, poor);
  if (points <= 0) {
    return;
  }

  drivers.push({
    id: questionPath,
    category,
    questionPath,
    questionLabel: questionLabel(questionPath),
    answerLabel: answerLabel(value, translate),
    points,
    explanation,
  });
}

function addCostDriver(
  drivers: RiskDriverInput[],
  category: ReviewRiskCategory,
  questionPath: string,
  value: unknown,
  explanation: string,
  translate: TranslateFn,
): void {
  const points = costRisk(value);
  if (points <= 0) {
    return;
  }

  drivers.push({
    id: questionPath,
    category,
    questionPath,
    questionLabel: questionLabel(questionPath),
    answerLabel: answerLabel(value, translate),
    points,
    explanation,
  });
}

function addBmiDriver(
  drivers: RiskDriverInput[],
  body: Record<string, unknown> | null,
  translate: TranslateFn,
): void {
  const points = bmiRisk(body);
  if (points <= 0) {
    return;
  }

  const bmi = bmiValue(body);
  drivers.push({
    id: 'bodyMetrics.bmi',
    category: 'demographic',
    questionPath: 'bodyMetrics.bmi',
    questionLabel: 'BMI risk profile',
    answerLabel: bmi === null ? translate('report.answerPresent') : `BMI ${bmi}`,
    points,
    explanation: 'BMI outside the preferred range adjusts the expected health cost model.',
  });
}

function addAgeDriver(
  drivers: RiskDriverInput[],
  age: number | null,
  translate: TranslateFn,
): void {
  const points = age !== null && age >= 60 ? 12 : age !== null && age >= 45 ? 6 : 0;
  if (points <= 0 || age === null) {
    return;
  }

  drivers.push({
    id: 'person.age',
    category: 'demographic',
    questionPath: 'person.age',
    questionLabel: 'Age band',
    answerLabel: `${age} ${translate('report.years')}`,
    points,
    explanation: 'Age band adjusts the expected monthly cost estimate.',
  });
}

function categoryScoresForDrivers(drivers: ReviewRiskDriver[]): ReviewCategoryScores {
  const scores = emptyCategoryScores();
  for (const driver of drivers) {
    scores[driver.category] += driver.points;
  }
  return scores;
}

function emptyCategoryScores(): ReviewCategoryScores {
  return {
    medical: 0,
    dental: 0,
    lifestyle: 0,
    insurance: 0,
    demographic: 0,
    financial: 0,
  };
}

function driverSeverity(points: number): ReviewRiskSeverity {
  if (points >= 22) {
    return 'critical';
  }
  if (points >= 14) {
    return 'high';
  }
  if (points >= 8) {
    return 'medium';
  }
  return 'low';
}

function estimateMonthlyChf(
  age: number | null,
  riskScore: number,
  dentalLoad: number,
): { min: number; max: number } {
  const base = age === null
    ? 320
    : age < 18
      ? 95
      : age < 31
        ? 280
        : age < 46
          ? 340
          : age < 60
            ? 430
            : 560;
  const midpoint = base + riskScore * 5.2 + dentalLoad * 1.7;

  return {
    min: Math.round((midpoint * 0.88) / 5) * 5,
    max: Math.round((midpoint * 1.18) / 5) * 5,
  };
}

function countPositiveAnswers(questionnaire: Record<string, unknown> | null): number {
  return YES_RISK_RULES
    .map((rule) => valueAtPath(questionnaire, rule.path))
    .filter((value) => yes(value))
    .length;
}

function riskLevel(score: number): ReviewRiskLevel {
  if (score >= 75) {
    return 'critical';
  }
  if (score >= 50) {
    return 'high';
  }
  if (score >= 25) {
    return 'medium';
  }
  return 'low';
}

function ageFromBirthYear(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value.trim())) {
    return null;
  }

  return Math.max(0, new Date().getFullYear() - Number(value.trim()));
}

function normalizePersonGender(value: unknown): PersonGender {
  return value === PersonGenderEnum.Female || value === PersonGenderEnum.Male || value === PersonGenderEnum.Baby
    ? value
    : PersonGenderEnum.Unknown;
}

function conditionRisk(value: unknown, medium: number, poor: number): number {
  const option = optionValue(value);
  if (option === 'poor') {
    return poor;
  }
  if (option === 'medium') {
    return medium;
  }
  return 0;
}

function costRisk(value: unknown): number {
  switch (optionValue(value)) {
    case 'up_to_1000':
      return 4;
    case 'up_to_5000':
    case '1000_to_3000':
      return 8;
    case '3000_to_5000':
      return 14;
    case 'over_5000':
      return 22;
    case 'over_10000':
      return 26;
    default:
      return 0;
  }
}

function bmiRisk(body: Record<string, unknown> | null): number {
  const bmi = bmiValue(body);
  if (bmi === null) {
    return 0;
  }

  if (bmi < 18.5 || bmi >= 35) {
    return 10;
  }
  if (bmi >= 30) {
    return 6;
  }
  return 0;
}

function bmiValue(body: Record<string, unknown> | null): number | null {
  const height = typeof body?.['heightCm'] === 'number' ? body['heightCm'] : null;
  const weight = typeof body?.['weightKg'] === 'number' ? body['weightKg'] : null;
  if (!height || !weight) {
    return null;
  }

  return Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
}

function questionLabel(path: string): string {
  const diagnosisMatch = path.match(/^diagnoses\.(\d+)\.(.+)$/);
  if (diagnosisMatch) {
    const [, index, field] = diagnosisMatch;
    return `Diagnosis ${index} - ${QUESTION_ANSWER_LABELS[`diagnoses.${field}`] ?? humanizePath(field)}`;
  }

  return QUESTION_ANSWER_LABELS[path] ?? humanizePath(path);
}

function answerLabel(value: unknown, translate: TranslateFn): string {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const option = value as OptionLike;
    if (typeof option.label === 'string' && option.label.trim()) {
      return compactAnswer(option.label);
    }
    if ('value' in option) {
      return answerLabel(option.value, translate);
    }
  }

  if (typeof value === 'boolean') {
    return value ? translate('report.answerYes') : translate('report.answerNo');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string' && value.trim()) {
    return compactAnswer(value);
  }

  return translate('report.answerPresent');
}

function compactAnswer(value: unknown): string {
  const text = String(value ?? '').trim();
  if (text.length <= 90) {
    return text;
  }

  return `${text.slice(0, 87)}...`;
}

function humanizePath(path: string): string {
  const label = path.split('.').at(-1) ?? path;
  return label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

function yes(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return optionValue(value) === true;
}

function optionValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  return (value as OptionLike).value;
}

function valueAtPath(root: Record<string, unknown> | null, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split('.')) {
    const record = asRecord(current);
    if (!record) {
      return undefined;
    }
    current = record[segment];
  }
  return current;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
