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

export type GenderValue = `${Gender}`;
export type PersonGenderValue = `${PersonGender}`;
export type PersonStepStatusValue = `${PersonStepStatus}`;
export type DiagnosisQuestionIdValue = `${DiagnosisQuestionId}`;
export type ImplantStatusValue = `${ImplantStatus}`;
export type DentalLevelValue = `${DentalLevel}`;
export type ProsthesesConditionValue = `${ProsthesesCondition}`;
export type BleedingOptionValue = `${BleedingOption}`;
export type JawCostValue = `${JawCost}`;
