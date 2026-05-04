export enum Gender {
  Female = 'female',
  Male = 'male',
  Other = 'other',
}

export enum PersonGender {
  Unknown = '',
  Female = 'female',
  Male = 'male',
  Baby = 'baby',
}

export enum PersonStepStatus {
  Inactive = 'inactive',
  Active = 'active',
  Completed = 'completed',
}

export enum DiagnosisQuestionId {
  Q4 = 'Q4',
  Q5 = 'Q5',
  Q6 = 'Q6',
  Q7 = 'Q7',
  Q8 = 'Q8',
  Q9 = 'Q9',
  Q10 = 'Q10',
  Q12 = 'Q12',
}

export enum ImplantStatus {
  InPlace = 'in_place',
  Removed = 'removed',
  WillBeRemoved = 'will_be_removed',
}

export enum DentalLevel {
  UpTo1000 = 'up_to_1000',
  _1000To3000 = '1000_to_3000',
  _3000To5000 = '3000_to_5000',
  Over5000 = 'over_5000',
}

export enum ProsthesesCondition {
  Good = 'good',
  Medium = 'medium',
  Poor = 'poor',
}

export enum BleedingOption {
  Yes = 'yes',
  No = 'no',
  Partial = 'partial',
  Everywhere = 'everywhere',
}

export enum JawCost {
  UpTo5000 = 'up_to_5000',
  _1000To3000 = '1000_to_3000',
  _3000To5000 = '3000_to_5000',
  Over10000 = 'over_10000',
}

export enum SubstanceKind {
  Nicotine = 'nicotine',
  Alcohol = 'alcohol',
  Drug = 'drug',
}

export enum QuestionAnswerKey {
  Q4 = 'q4',
  Q4A = 'q4a',
  Q4B = 'q4b',
  Q5 = 'q5',
  Q6 = 'q6',
  Q7 = 'q7',
  Q8 = 'q8',
  Q9 = 'q9',
  Q9A = 'q9a',
  Q10 = 'q10',
  Q10A = 'q10a',
  Q11 = 'q11',
  Q12 = 'q12',
  Q12A = 'q12a',
  Q13 = 'q13',
  Q16 = 'q16',
  Q17 = 'q17',
}

export enum QuestionnairePath {
  PreviousInsurance = 'previousInsurance',
  QuestionAnswers = 'questionAnswers',
  Lifestyle = 'lifestyle',
  DentalInfo = 'dentalInfo',
  Diagnoses = 'diagnoses',
}

export enum ValidationErrorKey {
  Required = 'required',
  MinLength = 'minlength',
  MaxLength = 'maxlength',
  Min = 'min',
  Max = 'max',
  Email = 'email',
  Pattern = 'pattern',
  FullDate = 'fullDate',
  DateOrder = 'dateOrder',
  PostalCode = 'postalCode',
  StreetNumber = 'streetNumber',
  BirthYear = 'birthYear',
  BabyAge = 'babyAge',
}

export enum AvatarAgeBand {
  Baby = 'baby',
  Child = 'child',
  Adult = 'adult',
  Senior = 'senior',
  Unknown = 'unknown',
}

export const DIAGNOSIS_QUESTION_IDS = [
  DiagnosisQuestionId.Q4,
  DiagnosisQuestionId.Q5,
  DiagnosisQuestionId.Q6,
  DiagnosisQuestionId.Q7,
  DiagnosisQuestionId.Q8,
  DiagnosisQuestionId.Q9,
  DiagnosisQuestionId.Q10,
  DiagnosisQuestionId.Q12,
] as const;

export const FAMILY_GENDER_OPTIONS = [
  { value: PersonGender.Female, label: 'Female' },
  { value: PersonGender.Male, label: 'Male' },
  { value: PersonGender.Baby, label: 'Baby' },
] as const;

export const QUESTIONNAIRE_GENDER_OPTIONS = [
  { value: Gender.Female, label: 'Female' },
  { value: Gender.Male, label: 'Male' },
  { value: Gender.Other, label: 'Other' },
] as const;

export const IMPLANT_STATUS_OPTIONS = [
  { value: ImplantStatus.InPlace, label: 'Verbleibt' },
  { value: ImplantStatus.Removed, label: 'Entfernt' },
  { value: ImplantStatus.WillBeRemoved, label: 'Wird entfernt' },
] as const;

export const DENTAL_LEVEL_OPTIONS = [
  { value: DentalLevel.UpTo1000, label: 'Bis CHF 1 000.-' },
  { value: DentalLevel._1000To3000, label: 'CHF 1 000.- bis CHF 3 000.-' },
  { value: DentalLevel._3000To5000, label: 'CHF 3 000.- bis CHF 5 000.-' },
  { value: DentalLevel.Over5000, label: 'Über CHF 5 000.-' },
] as const;

export const DENTA_LEVEL_OPTIONS = [
  { value: DentalLevel.UpTo1000, label: '1. 50 % max. CHF 500.' },
  { value: DentalLevel._1000To3000, label: '2. 50 % max. CHF 1 000.' },
  { value: DentalLevel._3000To5000, label: '3. 75 % max. CHF 1 500.' },
  { value: DentalLevel.Over5000, label: '4. 75 % max. CHF 2 000.' },
] as const;

export const PROSTHESES_CONDITION_OPTIONS = [
  { value: ProsthesesCondition.Good, label: 'Gut' },
  { value: ProsthesesCondition.Medium, label: 'Mittel' },
  { value: ProsthesesCondition.Poor, label: 'Schlecht' },
] as const;

export const BLEEDING_OPTIONS = [
  { value: BleedingOption.Yes, label: 'Ja' },
  { value: BleedingOption.No, label: 'Nein' },
  { value: BleedingOption.Partial, label: 'Teilweise' },
  { value: BleedingOption.Everywhere, label: 'Überall' },
] as const;

export const JAW_COST_OPTIONS = [
  { value: JawCost.UpTo5000, label: 'Bis CHF 5 000.-' },
  { value: JawCost._1000To3000, label: 'CHF 1 000.- bis CHF 3 000.-' },
  { value: JawCost._3000To5000, label: 'CHF 3 000.- bis CHF 5 000.-' },
  { value: JawCost.Over10000, label: 'Über CHF 10 000.-' },
] as const;

export type GenderValue = `${Gender}`;
export type PersonGenderValue = `${PersonGender}`;
export type PersonStepStatusValue = `${PersonStepStatus}`;
export type DiagnosisQuestionIdValue = `${DiagnosisQuestionId}`;
export type ImplantStatusValue = `${ImplantStatus}`;
export type DentalLevelValue = `${DentalLevel}`;
export type ProsthesesConditionValue = `${ProsthesesCondition}`;
export type BleedingOptionValue = `${BleedingOption}`;
export type JawCostValue = `${JawCost}`;
