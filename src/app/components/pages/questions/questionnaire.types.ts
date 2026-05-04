import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { OptionValue } from '../../form-controls';
import {
  type BleedingOptionValue,
  type DentalLevelValue,
  type DiagnosisQuestionIdValue,
  type GenderValue,
  type ImplantStatusValue,
  type JawCostValue,
  type ProsthesesConditionValue,
} from '../../../constants/app-enums';

export type Gender = GenderValue;
export type DiagnosisQuestionId = DiagnosisQuestionIdValue;
export type StringControl = FormControl<string | null>;
export type NumberControl = FormControl<number | null>;
export type BooleanControl = FormControl<boolean>;
export type YesNoControl = FormControl<OptionValue<boolean> | null>;
export type OptionControl<T extends string = string> = FormControl<OptionValue<T> | null>;

export interface DoctorAddressControls {
  doctorGivenNames: StringControl;
  doctorFamilyName: StringControl;
  doctorStreet: StringControl;
  doctorStreetNumber: StringControl;
  doctorPostalCode: StringControl;
  doctorCity: StringControl;
}

export interface DoctorInfoControls {
  practiceName: StringControl;
  familyName: StringControl;
  givenNames: StringControl;
  street: StringControl;
  streetNumber: StringControl;
  postalCode: StringControl;
  city: StringControl;
}

export interface BodyMetricsControls {
  heightCm: NumberControl;
  weightKg: NumberControl;
}

export interface DiagnosisEntryControls extends DoctorAddressControls {
  id: FormControl<string>;
  questionId: FormControl<DiagnosisQuestionId>;
  condition: StringControl;
  from: StringControl;
  to: StringControl;
  recovered: YesNoControl;
  notes: StringControl;
  implantAnswer: YesNoControl;
  implantDetails: StringControl;
  implantStatus: OptionControl<ImplantStatusValue>;
  name: StringControl;
  amountPerDay: StringControl;
  duration: StringControl;
}

export type DiagnosisEntryGroup = FormGroup<DiagnosisEntryControls>;

export interface PreviousInsuranceControls {
  q1: YesNoControl;
  q1a: StringControl;
  q1b: YesNoControl;
}

export interface QuestionAnswerControls {
  q4: YesNoControl;
  q4a: StringControl;
  q4b: YesNoControl;
  q5: YesNoControl;
  q6: YesNoControl;
  q7: YesNoControl;
  q8: YesNoControl;
  q9: YesNoControl;
  q9a: StringControl;
  q10: YesNoControl;
  q10a: YesNoControl;
  q11: YesNoControl;
  q12: YesNoControl;
  q12a: StringControl;
  q13: YesNoControl;
  q16: YesNoControl;
  q17: YesNoControl;
}

export interface LifestyleControls {
  nicotineUse: BooleanControl;
  nicotineUnits: StringControl;
  nicotineFrequency: StringControl;
  nicotineFrom: StringControl;
  nicotineTo: StringControl;
  alcoholUse: BooleanControl;
  alcoholUnits: StringControl;
  alcoholFrequency: StringControl;
  alcoholFrom: StringControl;
  alcoholTo: StringControl;
  drugUse: BooleanControl;
  drugUnits: StringControl;
  drugFrequency: StringControl;
  drugFrom: StringControl;
  drugTo: StringControl;
}

export interface DentalInfoControls {
  pregnancyDate: StringControl;
  pregnancyWeightBefore: NumberControl;
  desiredLevel: OptionControl<DentalLevelValue>;
  toothStatusNotes: StringControl;
  toothStatusUpper: FormControl<number[]>;
  toothStatusLower: FormControl<number[]>;
  findingDate: StringControl;
  prosthesesCondition: OptionControl<ProsthesesConditionValue>;
  prosthesesReason: StringControl;
  parodontitisBleeding: OptionControl<BleedingOptionValue>;
  parodontitisUpper: FormControl<number[]>;
  parodontitisLower: FormControl<number[]>;
  parodontitisRemarks: StringControl;
  jawDescription: StringControl;
  angleClass: StringControl;
  jawExpectedWork: YesNoControl;
  jawReason: StringControl;
  jawTreatments: StringControl;
  jawCostEstimate: OptionControl<JawCostValue>;
  hygiene: OptionControl<ProsthesesConditionValue>;
  hygieneReason: StringControl;
  lastTreatment: StringControl;
  firstTreatment: StringControl;
  dentalInsuranceExam: StringControl;
  accidentDentalInjuries: YesNoControl;
  accidentAffectedTeeth: StringControl;
  accidentTreatments: StringControl;
  dentalProceduresPlanned: YesNoControl;
  plannedProcedures: StringControl;
  plannedTreatmentDate: StringControl;
  treatmentDelayReason: StringControl;
  plannedDentalCost: OptionControl<DentalLevelValue>;
}

export interface QuestionnaireControls {
  applicantGender: OptionControl<Gender>;
  previousInsurance: FormGroup<PreviousInsuranceControls>;
  doctorInfo: FormGroup<DoctorInfoControls>;
  bodyMetrics: FormGroup<BodyMetricsControls>;
  questionAnswers: FormGroup<QuestionAnswerControls>;
  diagnoses: FormArray<DiagnosisEntryGroup>;
  lifestyle: FormGroup<LifestyleControls>;
  dentalInfo: FormGroup<DentalInfoControls>;
}

export type QuestionnaireForm = FormGroup<QuestionnaireControls>;
