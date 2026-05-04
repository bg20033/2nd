import { Injectable, OnDestroy, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  BleedingOption,
  DentalLevel,
  DiagnosisQuestionId as DiagnosisQuestion,
  Gender as GenderEnum,
  ImplantStatus,
  JawCost,
  ProsthesesCondition,
} from '../../../constants/app-enums';
import { OptionValue } from '../../form-controls';
import {
  BodyMetricsControls,
  DentalInfoControls,
  DiagnosisEntryControls,
  DiagnosisEntryGroup,
  DiagnosisQuestionId,
  DoctorInfoControls,
  Gender,
  LifestyleControls,
  PreviousInsuranceControls,
  QuestionAnswerControls,
  QuestionnaireForm,
  StringControl,
  YesNoControl,
} from './questionnaire.types';

type ToggleValidatorConfig = {
  active: boolean;
  validators: ValidatorFn[];
  resetValue?: unknown;
};

type DiagnosisAnswerKey = 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10' | 'q12';

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function fullDateValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;

  if (!value) {
    return null;
  }

  return DATE_PATTERN.test(value) ? null : { fullDate: true };
}

export function dateOrderValidator(fromKey = 'from', toKey = 'to'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const from = control.get(fromKey)?.value;
    const to = control.get(toKey)?.value;

    if (!from || !to || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return null;
    }

    return to >= from ? null : { dateOrder: true };
  };
}

export function postalCodeValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;
  return !value || /^\d{4,6}$/.test(value) ? null : { postalCode: true };
}

export function streetNumberValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;
  return !value || /^\d+$/.test(value) ? null : { streetNumber: true };
}

export function minDiagnosisEntriesValidator(
  questionId: DiagnosisQuestionId,
  answerControl: FormControl<OptionValue<boolean> | null>,
  min = 1,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const entries = control as FormArray<DiagnosisEntryGroup>;
    const answerIsYes = answerControl.value?.value === true;

    if (!answerIsYes) {
      return null;
    }

    const count = entries.controls.filter((entry) => entry.controls.questionId.value === questionId).length;
    return count >= min ? null : { [`minDiagnosis_${questionId}`]: { min, actual: count, questionId } };
  };
}

const DIAGNOSIS_QUESTION_IDS: readonly DiagnosisQuestionId[] = [
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'Q8',
  'Q9',
  'Q10',
  'Q12',
];

@Injectable()
export class QuestionnaireFormService implements OnDestroy {
  readonly genderOptions: readonly OptionValue<Gender>[] = [
    { value: GenderEnum.Female, label: 'Female' },
    { value: GenderEnum.Male, label: 'Male' },
    { value: GenderEnum.Other, label: 'Other' },
  ];

  readonly implantStatusOptions = [
    { value: ImplantStatus.InPlace, label: 'Verbleibt' },
    { value: ImplantStatus.Removed, label: 'Entfernt' },
    { value: ImplantStatus.WillBeRemoved, label: 'Wird entfernt' },
  ] as const;

  readonly dentalLevelOptions = [
    { value: DentalLevel.UpTo1000, label: 'Bis CHF 1 000.-' },
    { value: DentalLevel._1000To3000, label: 'CHF 1 000.- bis CHF 3 000.-' },
    { value: DentalLevel._3000To5000, label: 'CHF 3 000.- bis CHF 5 000.-' },
    { value: DentalLevel.Over5000, label: 'Über CHF 5 000.-' },
  ] as const;

  readonly dentaLevelOptions = [
    { value: DentalLevel.UpTo1000, label: '1. 50 % max. CHF 500.' },
    { value: DentalLevel._1000To3000, label: '2. 50 % max. CHF 1 000.' },
    { value: DentalLevel._3000To5000, label: '3. 75 % max. CHF 1 500.' },
    { value: DentalLevel.Over5000, label: '4. 75 % max. CHF 2 000.' },
  ] as const;

  readonly prosthesesConditionOptions = [
    { value: ProsthesesCondition.Good, label: 'Gut' },
    { value: ProsthesesCondition.Medium, label: 'Mittel' },
    { value: ProsthesesCondition.Poor, label: 'Schlecht' },
  ] as const;

  readonly bleedingOptions = [
    { value: BleedingOption.Yes, label: 'Ja' },
    { value: BleedingOption.No, label: 'Nein' },
    { value: BleedingOption.Partial, label: 'Teilweise' },
    { value: BleedingOption.Everywhere, label: 'Überall' },
  ] as const;

  readonly jawCostOptions = [
    { value: JawCost.UpTo5000, label: 'Bis CHF 5 000.-' },
    { value: JawCost._1000To3000, label: 'CHF 1 000.- bis CHF 3 000.-' },
    { value: JawCost._3000To5000, label: 'CHF 3 000.- bis CHF 5 000.-' },
    { value: JawCost.Over10000, label: 'Über CHF 10 000.-' },
  ] as const;

  readonly form: QuestionnaireForm = new FormGroup({
    applicantGender: new FormControl<OptionValue<Gender> | null>(null, Validators.required),
    previousInsurance: this.createPreviousInsuranceGroup(),
    doctorInfo: this.createDoctorInfoGroup(),
    bodyMetrics: this.createBodyMetricsGroup(),
    questionAnswers: this.createQuestionAnswerGroup(),
    diagnoses: new FormArray<DiagnosisEntryGroup>([]),
    lifestyle: this.createLifestyleGroup(),
    dentalInfo: this.createDentalInfoGroup(),
  });

  readonly rawValue = signal(this.form.getRawValue());

  private formSubscription?: Subscription;
  private diagnosisSubscriptions = new Map<string, Subscription>();
  private syncing = false;

  constructor() {
    this.form.controls.dentalInfo.controls.findingDate.setValue(this.today(), { emitEvent: false });

    this.installDiagnosisValidators();
    this.refreshValidationState();

    this.formSubscription = this.form.valueChanges.subscribe(() => {
      if (this.syncing) {
        return;
      }
      this.refreshValidationState();
    });
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  destroy(): void {
    this.formSubscription?.unsubscribe();
    for (const subscription of this.diagnosisSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.diagnosisSubscriptions.clear();
  }

  addDiagnosis(questionId: DiagnosisQuestionId): DiagnosisEntryGroup {
    const entry = this.createDiagnosisEntry(questionId);
    this.form.controls.diagnoses.push(entry);
    this.diagnosisSubscriptions.set(
      entry.controls.id.value,
      entry.valueChanges.subscribe(() => {
        if (!this.syncing) {
          this.syncDiagnosisEntryValidators(entry);
        }
      }),
    );
    this.syncDiagnosisEntryValidators(entry);
    this.form.controls.diagnoses.updateValueAndValidity();
    return entry;
  }

  removeDiagnosis(entry: DiagnosisEntryGroup): void {
    const entries = this.form.controls.diagnoses;
    const index = entries.controls.indexOf(entry);

    if (index >= 0) {
      this.diagnosisSubscriptions.get(entry.controls.id.value)?.unsubscribe();
      this.diagnosisSubscriptions.delete(entry.controls.id.value);
      entries.removeAt(index);
      entries.updateValueAndValidity();
    }
  }

  diagnosesFor(questionId: DiagnosisQuestionId): DiagnosisEntryGroup[] {
    return this.form.controls.diagnoses.controls.filter((entry) => entry.controls.questionId.value === questionId);
  }

  isYes(control: YesNoControl): boolean {
    return control.value?.value === true;
  }

  isFemale(): boolean {
    return this.form.controls.applicantGender.value?.value === GenderEnum.Female;
  }

  setApplicantGender(gender: OptionValue<Gender>): void {
    const control = this.form.controls.applicantGender;
    if (control.value?.value === gender.value) {
      return;
    }

    control.setValue(gender, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
    this.refreshValidationState();
  }

  refreshValidationState(): void {
    this.syncConditionalValidators();
    this.form.updateValueAndValidity({ emitEvent: false });
    this.rawValue.set(this.form.getRawValue());
  }

  submitValue() {
    this.refreshValidationState();
    this.markEnabledControlsTouched(this.form);
    this.form.updateValueAndValidity();
    return this.form.valid ? this.form.getRawValue() : null;
  }

  private createPreviousInsuranceGroup(): FormGroup<PreviousInsuranceControls> {
    return new FormGroup({
      q1: this.yesNoControl(true),
      q1a: this.textControl(),
      q1b: this.yesNoControl(),
    });
  }

  private createDoctorInfoGroup(): FormGroup<DoctorInfoControls> {
    return new FormGroup({
      practiceName: this.textControl([Validators.required, Validators.minLength(2)]),
      familyName: this.textControl([Validators.required, Validators.minLength(2)]),
      givenNames: this.textControl([Validators.required, Validators.minLength(2)]),
      street: this.textControl([Validators.required, Validators.minLength(2)]),
      streetNumber: this.textControl([Validators.required, streetNumberValidator]),
      postalCode: this.textControl([Validators.required, postalCodeValidator]),
      city: this.textControl([Validators.required, Validators.minLength(2)]),
    });
  }

  private createBodyMetricsGroup(): FormGroup<BodyMetricsControls> {
    return new FormGroup({
      heightCm: new FormControl<number | null>(null, [Validators.required, Validators.min(40), Validators.max(250)]),
      weightKg: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(200)]),
    });
  }

  private createQuestionAnswerGroup(): FormGroup<QuestionAnswerControls> {
    return new FormGroup({
      q4: this.yesNoControl(true),
      q4a: this.textControl(),
      q4b: this.yesNoControl(),
      q5: this.yesNoControl(true),
      q6: this.yesNoControl(true),
      q7: this.yesNoControl(true),
      q8: this.yesNoControl(true),
      q9: this.yesNoControl(true),
      q9a: this.textControl(),
      q10: this.yesNoControl(true),
      q10a: this.yesNoControl(),
      q11: this.yesNoControl(),
      q12: this.yesNoControl(true),
      q12a: this.textControl(),
      q13: this.yesNoControl(true),
      q16: this.yesNoControl(true),
      q17: this.yesNoControl(true),
    });
  }

  private createLifestyleGroup(): FormGroup<LifestyleControls> {
    return new FormGroup({
      nicotineUse: new FormControl(false, { nonNullable: true }),
      nicotineUnits: this.textControl(),
      nicotineFrequency: this.textControl(),
      nicotineFrom: this.textControl(),
      nicotineTo: this.textControl(),
      alcoholUse: new FormControl(false, { nonNullable: true }),
      alcoholUnits: this.textControl(),
      alcoholFrequency: this.textControl(),
      alcoholFrom: this.textControl(),
      alcoholTo: this.textControl(),
      drugUse: new FormControl(false, { nonNullable: true }),
      drugUnits: this.textControl(),
      drugFrequency: this.textControl(),
      drugFrom: this.textControl(),
      drugTo: this.textControl(),
    });
  }

  private createDentalInfoGroup(): FormGroup<DentalInfoControls> {
    return new FormGroup({
      pregnancyDate: this.textControl(),
      pregnancyWeightBefore: new FormControl<number | null>(null),
      desiredLevel: new FormControl(null, Validators.required) as DentalInfoControls['desiredLevel'],
      toothStatusNotes: this.textControl([Validators.required, Validators.minLength(2)]),
      toothStatusUpper: new FormControl<number[]>([], { nonNullable: true }),
      toothStatusLower: new FormControl<number[]>([], { nonNullable: true }),
      findingDate: this.textControl(),
      prosthesesCondition: new FormControl(null, Validators.required) as DentalInfoControls['prosthesesCondition'],
      prosthesesReason: this.textControl(),
      parodontitisBleeding: new FormControl(null) as DentalInfoControls['parodontitisBleeding'],
      parodontitisUpper: new FormControl<number[]>([], { nonNullable: true }),
      parodontitisLower: new FormControl<number[]>([], { nonNullable: true }),
      parodontitisRemarks: this.textControl(),
      jawDescription: this.textControl(),
      angleClass: this.textControl(),
      jawExpectedWork: this.yesNoControl(),
      jawReason: this.textControl(),
      jawTreatments: this.textControl(),
      jawCostEstimate: new FormControl(null) as DentalInfoControls['jawCostEstimate'],
      hygiene: new FormControl(null, Validators.required) as DentalInfoControls['hygiene'],
      hygieneReason: this.textControl(),
      lastTreatment: this.textControl([Validators.required, Validators.minLength(2)]),
      firstTreatment: this.textControl([Validators.required, Validators.minLength(2)]),
      dentalInsuranceExam: this.textControl([Validators.required, Validators.minLength(2)]),
      accidentDentalInjuries: this.yesNoControl(true),
      accidentAffectedTeeth: this.textControl(),
      accidentTreatments: this.textControl(),
      dentalProceduresPlanned: this.yesNoControl(true),
      plannedProcedures: this.textControl(),
      plannedTreatmentDate: this.textControl(),
      treatmentDelayReason: this.textControl(),
      plannedDentalCost: new FormControl(null, Validators.required) as DentalInfoControls['plannedDentalCost'],
    });
  }

  private createDiagnosisEntry(questionId: DiagnosisQuestionId): DiagnosisEntryGroup {
    return new FormGroup(
      {
        id: new FormControl(String(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)), {
          nonNullable: true,
        }),
        questionId: new FormControl(questionId, { nonNullable: true }),
        condition: this.textControl([Validators.required, Validators.minLength(5)]),
        from: this.dateControl([Validators.required]),
        to: this.dateControl(),
        recovered: this.yesNoControl(true),
        doctorGivenNames: this.textControl([Validators.required, Validators.minLength(2)]),
        doctorFamilyName: this.textControl([Validators.required, Validators.minLength(2)]),
        doctorStreet: this.textControl([Validators.required, Validators.minLength(2)]),
        doctorStreetNumber: this.textControl([Validators.required, streetNumberValidator]),
        doctorPostalCode: this.textControl([Validators.required, postalCodeValidator]),
        doctorCity: this.textControl([Validators.required, Validators.minLength(2)]),
        notes: this.textControl(),
        implantAnswer: this.yesNoControl(),
        implantDetails: this.textControl(),
        implantStatus: new FormControl(null) as DiagnosisEntryControls['implantStatus'],
        name: this.textControl(),
        amountPerDay: this.textControl(),
        duration: this.textControl(),
      },
      { validators: dateOrderValidator('from', 'to') },
    );
  }

  private installDiagnosisValidators(): void {
    const answers = this.form.controls.questionAnswers.controls;
    this.form.controls.diagnoses.addValidators([
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q4, answers.q4),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q5, answers.q5),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q6, answers.q6),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q7, answers.q7),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q8, answers.q8),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q9, answers.q9),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q10, answers.q10),
      minDiagnosisEntriesValidator(DiagnosisQuestion.Q12, answers.q12),
    ]);
  }

  private syncConditionalValidators(): void {
    this.syncing = true;
    try {
      const previous = this.form.controls.previousInsurance.controls;
      const answers = this.form.controls.questionAnswers.controls;
      const lifestyle = this.form.controls.lifestyle.controls;
      const dental = this.form.controls.dentalInfo.controls;

      const q1Active = this.isYes(previous.q1);
      const q4Active = this.isYes(answers.q4);
      const femalePregnancy = this.isFemale() && this.isYes(answers.q11);
      const q16Active = this.isYes(answers.q16);
      const q17Active = this.isYes(answers.q17);
      const jawWork = q17Active && this.isYes(dental.jawExpectedWork);
      const accident = this.isYes(dental.accidentDentalInjuries);
      const planned = this.isYes(dental.dentalProceduresPlanned);

      const rules: [AbstractControl, boolean, ValidatorFn[]][] = [
        [previous.q1a, q1Active, [Validators.required, Validators.minLength(2)]],
        [previous.q1b, q1Active, [Validators.required]],
        [answers.q4a, q4Active, [Validators.required, Validators.minLength(2)]],
        [answers.q4b, q4Active, [Validators.required]],
        [answers.q9a, this.isYes(answers.q9), [Validators.required, Validators.minLength(2)]],
        [answers.q10a, this.isYes(answers.q10), [Validators.required]],
        [answers.q11, this.isFemale(), [Validators.required]],
        [answers.q12a, false, []],
        [dental.pregnancyDate, femalePregnancy, [Validators.required]],
        [dental.pregnancyWeightBefore, femalePregnancy, [Validators.required, Validators.min(0), Validators.max(200)]],
        [dental.prosthesesReason, this.needsConditionReason(dental.prosthesesCondition.value?.value), [Validators.required, Validators.minLength(2)]],
        [dental.parodontitisBleeding, q16Active, [Validators.required]],
        [dental.parodontitisRemarks, q16Active, [Validators.required, Validators.minLength(2)]],
        [dental.jawDescription, q17Active, [Validators.required, Validators.minLength(2)]],
        [dental.angleClass, q17Active, [Validators.required, Validators.minLength(1)]],
        [dental.jawExpectedWork, q17Active, [Validators.required]],
        [dental.jawReason, jawWork, [Validators.required, Validators.minLength(2)]],
        [dental.jawTreatments, jawWork, [Validators.required, Validators.minLength(2)]],
        [dental.jawCostEstimate, jawWork, [Validators.required]],
        [dental.hygieneReason, this.needsConditionReason(dental.hygiene.value?.value), [Validators.required, Validators.minLength(2)]],
        [dental.accidentAffectedTeeth, accident, [Validators.required, Validators.minLength(2)]],
        [dental.accidentTreatments, accident, [Validators.required, Validators.minLength(2)]],
        [dental.plannedProcedures, planned, [Validators.required, Validators.minLength(2)]],
        [dental.plannedTreatmentDate, planned, [Validators.required, Validators.minLength(2)]],
        [dental.treatmentDelayReason, planned, [Validators.required, Validators.minLength(2)]],
      ];

      for (const [control, active, validators] of rules) {
        this.setConditional(control, { active, validators });
      }

      for (const questionId of DIAGNOSIS_QUESTION_IDS) {
        this.syncDiagnosisEntriesForAnswer(questionId, answers[this.answerKeyForDiagnosis(questionId)]);
      }

      const q13Active = this.isYes(answers.q13);
      if (!q13Active) {
        lifestyle.nicotineUse.setValue(false, { emitEvent: false });
        lifestyle.alcoholUse.setValue(false, { emitEvent: false });
        lifestyle.drugUse.setValue(false, { emitEvent: false });
      }
      this.syncSubstanceBlock(
        q13Active && lifestyle.nicotineUse.value,
        lifestyle.nicotineUnits,
        lifestyle.nicotineFrequency,
        lifestyle.nicotineFrom,
        lifestyle.nicotineTo,
      );
      this.syncSubstanceBlock(
        q13Active && lifestyle.alcoholUse.value,
        lifestyle.alcoholUnits,
        lifestyle.alcoholFrequency,
        lifestyle.alcoholFrom,
        lifestyle.alcoholTo,
      );
      this.syncSubstanceBlock(
        q13Active && lifestyle.drugUse.value,
        lifestyle.drugUnits,
        lifestyle.drugFrequency,
        lifestyle.drugFrom,
        lifestyle.drugTo,
      );

      for (const entry of this.form.controls.diagnoses.controls) {
        this.syncDiagnosisEntryValidators(entry);
      }

      this.form.controls.diagnoses.updateValueAndValidity({ emitEvent: false });
    } finally {
      this.syncing = false;
    }
  }

  private syncDiagnosisEntryValidators(entry: DiagnosisEntryGroup): void {
    const questionId = entry.controls.questionId.value;
    const isImplantQuestion = questionId === DiagnosisQuestion.Q7 || questionId === DiagnosisQuestion.Q8;
    const isMedicationQuestion = questionId === DiagnosisQuestion.Q12;
    const implantYes = this.isYes(entry.controls.implantAnswer);

    this.setConditional(entry.controls.implantAnswer, { active: isImplantQuestion, validators: [Validators.required] });
    this.setConditional(entry.controls.implantDetails, {
      active: isImplantQuestion && implantYes,
      validators: [Validators.required, Validators.minLength(2)],
    });
    this.setConditional(entry.controls.implantStatus, {
      active: isImplantQuestion && implantYes,
      validators: [Validators.required],
    });
    this.setConditional(entry.controls.name, {
      active: isMedicationQuestion,
      validators: [Validators.required, Validators.minLength(2)],
    });
    this.setConditional(entry.controls.amountPerDay, {
      active: isMedicationQuestion,
      validators: [Validators.required, Validators.minLength(1)],
    });
    this.setConditional(entry.controls.duration, {
      active: isMedicationQuestion,
      validators: [Validators.required, Validators.minLength(1)],
    });
  }

  private syncSubstanceBlock(
    active: boolean,
    units: StringControl,
    frequency: StringControl,
    from: StringControl,
    to: StringControl,
  ): void {
    this.setConditional(units, { active, validators: [Validators.required, Validators.minLength(1)] });
    this.setConditional(frequency, { active, validators: [Validators.required, Validators.minLength(1)] });
    this.setConditional(from, { active, validators: [] });
    this.setConditional(to, { active, validators: [] });
  }

  needsConditionReason(value: string | null | undefined): boolean {
    return [ProsthesesCondition.Medium, ProsthesesCondition.Poor].includes(value as ProsthesesCondition);
  }

  private clearDiagnosisEntriesWhenNo(questionId: DiagnosisQuestionId, answer: YesNoControl): void {
    if (this.isYes(answer)) {
      return;
    }

    const entries = this.form.controls.diagnoses;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries.at(index).controls.questionId.value === questionId) {
        this.diagnosisSubscriptions.get(entries.at(index).controls.id.value)?.unsubscribe();
        this.diagnosisSubscriptions.delete(entries.at(index).controls.id.value);
        entries.removeAt(index, { emitEvent: false });
      }
    }
  }

  private syncDiagnosisEntriesForAnswer(questionId: DiagnosisQuestionId, answer: YesNoControl): void {
    if (!DIAGNOSIS_QUESTION_IDS.includes(questionId)) {
      return;
    }

    if (!this.isYes(answer)) {
      this.clearDiagnosisEntriesWhenNo(questionId, answer);
      return;
    }

    if (this.diagnosesFor(questionId).length === 0) {
      this.addDiagnosis(questionId);
    }
  }

  private answerKeyForDiagnosis(questionId: DiagnosisQuestionId): DiagnosisAnswerKey {
    switch (questionId) {
      case DiagnosisQuestion.Q4:
        return 'q4';
      case DiagnosisQuestion.Q5:
        return 'q5';
      case DiagnosisQuestion.Q6:
        return 'q6';
      case DiagnosisQuestion.Q7:
        return 'q7';
      case DiagnosisQuestion.Q8:
        return 'q8';
      case DiagnosisQuestion.Q9:
        return 'q9';
      case DiagnosisQuestion.Q10:
        return 'q10';
      case DiagnosisQuestion.Q12:
        return 'q12';
      default:
        throw new Error(`Diagnosis question ${questionId} does not have a yes/no answer control.`);
    }
  }

  private setConditional(control: AbstractControl, config: ToggleValidatorConfig): void {
    if (config.active) {
      control.setValidators(config.validators);
    } else {
      control.clearValidators();
      control.setValue(config.resetValue ?? null, { emitEvent: false });
      control.markAsPristine({ emitEvent: false });
      control.markAsUntouched({ emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private markEnabledControlsTouched(control: AbstractControl): void {
    if (control.disabled) {
      return;
    }

    control.markAsTouched({ onlySelf: true });

    if (control instanceof FormGroup || control instanceof FormArray) {
      for (const child of Object.values(control.controls)) {
        this.markEnabledControlsTouched(child);
      }
    }
  }

  private textControl(validators: ValidatorFn[] = []): StringControl {
    return new FormControl<string | null>(null, validators);
  }

  private dateControl(validators: ValidatorFn[] = []): StringControl {
    return new FormControl<string | null>(null, [...validators, fullDateValidator]);
  }

  private yesNoControl(required = false): YesNoControl {
    return new FormControl<OptionValue<boolean> | null>(null, required ? Validators.required : null);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
