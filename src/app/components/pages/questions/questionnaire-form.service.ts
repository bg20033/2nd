import { Injectable, OnDestroy, computed } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  DIAGNOSIS_QUESTION_IDS,
  DiagnosisQuestionId as DiagnosisQuestion,
  Gender as GenderEnum,
  BleedingOption,
  DentalLevel,
  ImplantStatus,
  JawCost,
  QuestionAnswerKey,
  ProsthesesCondition,
  SubstanceKind,
} from '../../../constants/app-enums';
import { TranslationService } from '../../../services/translation.service';
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
import {
  DiagnosisAnswerKey,
  DIAGNOSIS_QUESTION_TO_ANSWER_KEY,
  SUBSTANCE_FIELD_MAP,
} from './questionnaire-metadata';
import {
  dateOrderValidator,
  fullDateValidator,
  minDiagnosisEntriesValidator,
  postalCodeValidator,
  streetNumberValidator,
} from './questionnaire-validators';

type ToggleValidatorConfig = {
  active: boolean;
  validators: ValidatorFn[];
  resetValue?: unknown;
};

@Injectable()
export class QuestionnaireFormService implements OnDestroy {
  constructor(private readonly i18n: TranslationService) {
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

  readonly genderOptions = computed<readonly OptionValue<Gender>[]>(() => {
    this.i18n.language();
    return [
      { value: GenderEnum.Female, label: this.i18n.translate('family.gender.female') },
      { value: GenderEnum.Male, label: this.i18n.translate('family.gender.male') },
      { value: GenderEnum.Other, label: this.i18n.translate('genderOther') },
    ];
  });

  readonly implantStatusOptions = computed<readonly OptionValue<ImplantStatus>[]>(() => {
    this.i18n.language();
    return [
      { value: ImplantStatus.InPlace, label: this.i18n.translate('health.question7.implantStatus.retained') },
      { value: ImplantStatus.Removed, label: this.i18n.translate('health.question7.implantStatus.removed') },
      { value: ImplantStatus.WillBeRemoved, label: this.i18n.translate('health.question7.implantStatus.scheduledRemoval') },
    ];
  });

  readonly dentalLevelOptions = computed<readonly OptionValue<DentalLevel>[]>(() => {
    this.i18n.language();
    return [
      { value: DentalLevel.UpTo1000, label: this.i18n.translate('costUpTo1000') },
      { value: DentalLevel._1000To3000, label: this.i18n.translate('cost1000To3000') },
      { value: DentalLevel._3000To5000, label: this.i18n.translate('cost3000To5000') },
      { value: DentalLevel.Over5000, label: this.i18n.translate('costOver5000') },
    ];
  });

  readonly dentaLevelOptions = computed<readonly OptionValue<DentalLevel>[]>(() => {
    this.i18n.language();
    return [
      { value: DentalLevel.UpTo1000, label: this.i18n.translate('dentaLevel1') },
      { value: DentalLevel._1000To3000, label: this.i18n.translate('dentaLevel2') },
      { value: DentalLevel._3000To5000, label: this.i18n.translate('dentaLevel3') },
      { value: DentalLevel.Over5000, label: this.i18n.translate('dentaLevel4') },
    ];
  });

  readonly prosthesesConditionOptions = computed<readonly OptionValue<ProsthesesCondition>[]>(() => {
    this.i18n.language();
    return [
      { value: ProsthesesCondition.Good, label: this.i18n.translate('common.condition.good') },
      { value: ProsthesesCondition.Medium, label: this.i18n.translate('common.condition.medium') },
      { value: ProsthesesCondition.Poor, label: this.i18n.translate('common.condition.poor') },
    ];
  });

  readonly bleedingOptions = computed<readonly OptionValue<BleedingOption>[]>(() => {
    this.i18n.language();
    return [
      { value: BleedingOption.Yes, label: this.i18n.translate('common.bleeding.yes') },
      { value: BleedingOption.No, label: this.i18n.translate('common.bleeding.no') },
      { value: BleedingOption.Partial, label: this.i18n.translate('common.bleeding.partial') },
      { value: BleedingOption.Everywhere, label: this.i18n.translate('common.bleeding.everywhere') },
    ];
  });

  readonly jawCostOptions = computed<readonly OptionValue<JawCost>[]>(() => {
    this.i18n.language();
    return [
      { value: JawCost.UpTo5000, label: this.i18n.translate('costUpTo5000') },
      { value: JawCost._1000To3000, label: this.i18n.translate('cost1000To3000') },
      { value: JawCost._3000To5000, label: this.i18n.translate('cost3000To5000') },
      { value: JawCost.Over10000, label: this.i18n.translate('costOver10000') },
    ];
  });

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

  private formSubscription?: Subscription;
  private diagnosisSubscriptions = new Map<string, Subscription>();
  private syncing = false;

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

  validateDiagnosisEntriesFor(questionId: DiagnosisQuestionId): boolean {
    this.refreshValidationState();
    const entries = this.diagnosesFor(questionId);

    for (const entry of entries) {
      this.markEnabledControlsTouched(entry);
      entry.updateValueAndValidity({ emitEvent: false });
    }

    this.form.controls.diagnoses.updateValueAndValidity({ emitEvent: false });
    return entries.every((entry) => entry.valid);
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
      [QuestionAnswerKey.Q4]: this.yesNoControl(true),
      [QuestionAnswerKey.Q4A]: this.textControl(),
      [QuestionAnswerKey.Q4B]: this.yesNoControl(),
      [QuestionAnswerKey.Q5]: this.yesNoControl(true),
      [QuestionAnswerKey.Q6]: this.yesNoControl(true),
      [QuestionAnswerKey.Q7]: this.yesNoControl(true),
      [QuestionAnswerKey.Q8]: this.yesNoControl(true),
      [QuestionAnswerKey.Q9]: this.yesNoControl(true),
      [QuestionAnswerKey.Q9A]: this.textControl(),
      [QuestionAnswerKey.Q10]: this.yesNoControl(true),
      [QuestionAnswerKey.Q10A]: this.yesNoControl(),
      [QuestionAnswerKey.Q11]: this.yesNoControl(),
      [QuestionAnswerKey.Q12]: this.yesNoControl(true),
      [QuestionAnswerKey.Q12A]: this.textControl(),
      [QuestionAnswerKey.Q13]: this.yesNoControl(true),
      [QuestionAnswerKey.Q16]: this.yesNoControl(true),
      [QuestionAnswerKey.Q17]: this.yesNoControl(true),
    });
  }

  private createLifestyleGroup(): FormGroup<LifestyleControls> {
    return new FormGroup(
      {
        nicotineUse: new FormControl(false, { nonNullable: true }),
        nicotineUnits: this.textControl(),
        nicotineFrequency: this.textControl(),
        nicotineFrom: this.dateControl(),
        nicotineTo: this.dateControl(),
        alcoholUse: new FormControl(false, { nonNullable: true }),
        alcoholUnits: this.textControl(),
        alcoholFrequency: this.textControl(),
        alcoholFrom: this.dateControl(),
        alcoholTo: this.dateControl(),
        drugUse: new FormControl(false, { nonNullable: true }),
        drugUnits: this.textControl(),
        drugFrequency: this.textControl(),
        drugFrom: this.dateControl(),
        drugTo: this.dateControl(),
      },
      {
        validators: Object.values(SUBSTANCE_FIELD_MAP).map(({ from, to }) => dateOrderValidator(from, to)),
      },
    );
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
        notes: this.textControl([Validators.required, Validators.minLength(2)]),
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
    this.form.controls.diagnoses.addValidators(
      DIAGNOSIS_QUESTION_IDS.map((questionId) =>
        minDiagnosisEntriesValidator(questionId, answers[DIAGNOSIS_QUESTION_TO_ANSWER_KEY[questionId]]),
      ),
    );
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
      for (const kind of [SubstanceKind.Nicotine, SubstanceKind.Alcohol, SubstanceKind.Drug]) {
        const fields = SUBSTANCE_FIELD_MAP[kind];
        const use = lifestyle[fields.use];
        this.syncSubstanceBlock(
          q13Active && use.value === true,
          lifestyle[fields.units] as StringControl,
          lifestyle[fields.frequency] as StringControl,
          lifestyle[fields.from] as StringControl,
          lifestyle[fields.to] as StringControl,
        );
      }

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
    this.setConditional(from, { active, validators: [fullDateValidator] });
    this.setConditional(to, { active, validators: [fullDateValidator] });
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
    if (!this.isYes(answer)) {
      this.clearDiagnosisEntriesWhenNo(questionId, answer);
      return;
    }

    if (this.diagnosesFor(questionId).length === 0) {
      this.addDiagnosis(questionId);
    }
  }

  private answerKeyForDiagnosis(questionId: DiagnosisQuestionId): DiagnosisAnswerKey {
    return DIAGNOSIS_QUESTION_TO_ANSWER_KEY[questionId as DiagnosisQuestion];
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
