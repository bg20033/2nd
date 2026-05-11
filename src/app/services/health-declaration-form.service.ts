import { Injectable, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { auditTime } from 'rxjs';

import {
  AvatarAgeBand,
  Gender as GenderEnum,
  type DiagnosisQuestionIdValue as DiagnosisQuestionId,
  PersonGender as PersonGenderEnum,
  PersonStepStatus as PersonStepStatusEnum,
  type PersonStepStatusValue,
  ValidationErrorKey,
} from '../constants/app-enums';
import type { OptionValue } from '../components/form-controls';
import { QuestionnaireFormService } from '../components/pages/questions/questionnaire-form.service';
import type { LocationFilterResponse } from './location.service';
import { TranslationService } from '../services/translation.service';
import {
  HEALTH_DECLARATION_STORAGE_VERSION,
  clearHealthDeclarationDraft,
  readHealthDeclarationDraft,
  writeHealthDeclarationDraft,
} from './health-declaration-draft-storage';
import { buildReviewDashboard } from './health-declaration-report-builder';
import type {
  PersonGender,
  ReviewDashboard,
  ReviewPersonScope,
  ReviewPersonSnapshot,
} from './health-declaration-report.types';

export type PersonStepStatus = PersonStepStatusValue;
export type FinalizePersonResult = 'invalid' | 'advanced' | 'review';
export type { PersonGender } from './health-declaration-report.types';

export type PersonControls = {
  id: FormControl<string>;
  completed: FormControl<boolean>;
  gender: FormControl<PersonGender>;
  birthYear: FormControl<string>;
};

export type PersonGroup = FormGroup<PersonControls>;

type DeclarationFormControls = {
  people: FormArray<PersonGroup>;
};

type StoredPersonData = ReviewPersonSnapshot;

type StoredDeclarationData = {
  version?: number;
  people?: StoredPersonData[];
  currentPersonIndex?: number;
  highestReachedPersonIndex?: number;
  reviewMode?: boolean;
  completedPersonIds?: string[];
  nextPersonId?: number;
  familyLocation?: LocationFilterResponse | null;
  familyLocationQuery?: string;
  timestamp?: number;
};

const AVATAR_ASSETS = {
  [AvatarAgeBand.Baby]: 'assets/babyIcon.png',
  [AvatarAgeBand.Child]: {
    [PersonGenderEnum.Female]: 'assets/avatar_kid_4.png',
    [PersonGenderEnum.Male]: 'assets/avatar_kid_3.png',
  },
  [AvatarAgeBand.Adult]: {
    [PersonGenderEnum.Female]: 'assets/avatar_adult_4.png',
    [PersonGenderEnum.Male]: 'assets/avatar_adult_3.png',
  },
  [AvatarAgeBand.Senior]: {
    [PersonGenderEnum.Female]: 'assets/avatar_elder_4.png',
    [PersonGenderEnum.Male]: 'assets/avatar_elder_3.png',
  },
  [AvatarAgeBand.Unknown]: 'assets/avatar_user.svg',
} as const;

@Injectable({ providedIn: 'root' })
export class HealthDeclarationFormService {
  private readonly i18n = inject(TranslationService);

  readonly currentPersonIndex = signal(0);
  readonly highestReachedPersonIndex = signal(0);
  readonly reviewMode = signal(false);
  readonly completedPersonIds = signal(new Set<string>());
  readonly familyLocation = signal<LocationFilterResponse | null>(null);
  readonly familyLocationQuery = signal('');
  readonly peopleVersion = signal(0);

  readonly peopleArray = new FormArray<PersonGroup>([]);
  readonly form = new FormGroup<DeclarationFormControls>({
    people: this.peopleArray,
  });

  private nextPersonId = 1;
  private readonly questionnaireServices = new Map<string, QuestionnaireFormService>();
  private readonly storedQuestionnaires = new Map<string, unknown>();
  private readonly questionnaireSubscriptions = new Map<
    string,
    ReturnType<QuestionnaireFormService['form']['valueChanges']['subscribe']>
  >();
  private readonly syncedApplicantGenders = new Map<string, PersonGender>();
  private activeQuestionnaireCache: {
    index: number;
    id: string;
    service: QuestionnaireFormService;
  } | null = null;
  private restoring = false;

  constructor() {
    this.restoreFromStorage();

    if (this.peopleArray.length === 0) {
      this.peopleArray.push(this.createPerson());
    }

    this.peopleArray.valueChanges.pipe(auditTime(250)).subscribe(() => this.syncPeopleState());
    this.peopleArray.statusChanges.pipe(auditTime(250)).subscribe(() => this.bumpPeopleVersion());
  }

  startNewDeclaration(): void {
    this.restoring = true;
    this.destroyQuestionnaireServices();
    this.peopleArray.clear({ emitEvent: false });
    this.nextPersonId = 1;
    this.peopleArray.push(this.createPerson(), { emitEvent: false });
    this.currentPersonIndex.set(0);
    this.highestReachedPersonIndex.set(0);
    this.reviewMode.set(false);
    this.completedPersonIds.set(new Set<string>());
    this.familyLocation.set(null);
    this.familyLocationQuery.set('');
    this.storedQuestionnaires.clear();
    this.syncedApplicantGenders.clear();
    this.activeQuestionnaireCache = null;
    this.restoring = false;
    this.bumpPeopleVersion();
    this.clearStoredData();
  }

  addPerson(): PersonGroup {
    const person = this.createPerson();
    this.peopleArray.push(person);
    this.reviewMode.set(false);
    this.syncPeopleState();
    return person;
  }

  removePerson(index: number): void {
    if (this.peopleArray.length <= 1 || index < 0 || index >= this.peopleArray.length) {
      return;
    }

    const person = this.peopleArray.at(index);
    const id = this.personId(person);
    this.questionnaireServices.get(id)?.destroy();
    this.questionnaireServices.delete(id);
    this.questionnaireSubscriptions.get(id)?.unsubscribe();
    this.questionnaireSubscriptions.delete(id);
    this.storedQuestionnaires.delete(id);
    this.syncedApplicantGenders.delete(id);
    if (this.activeQuestionnaireCache?.id === id) {
      this.activeQuestionnaireCache = null;
    }

    this.peopleArray.removeAt(index);
    this.setCompletedPersonId(id, false);

    const nextCurrentIndex = Math.min(this.currentPersonIndex(), this.peopleArray.length - 1);
    this.currentPersonIndex.set(Math.max(0, nextCurrentIndex));
    this.highestReachedPersonIndex.set(
      Math.min(this.highestReachedPersonIndex(), this.peopleArray.length - 1),
    );
    this.reviewMode.set(false);
    this.syncPeopleState();
  }

  personAt(index: number): PersonGroup | null {
    return (this.peopleArray.at(index) as PersonGroup | undefined) ?? null;
  }

  personId(person: AbstractControl): string {
    return (person.get('id')?.value as string | undefined) ?? '';
  }

  setFamilyLocation(location: LocationFilterResponse, query: string): void {
    this.familyLocation.set(location);
    this.familyLocationQuery.set(query);
    this.saveToStorage();
  }

  clearFamilyLocation(): void {
    this.familyLocation.set(null);
    this.familyLocationQuery.set('');
    this.saveToStorage();
  }

  familySetupValid(): boolean {
    return (
      this.familyLocation() !== null &&
      this.peopleArray.length > 0 &&
      this.peopleArray.controls.every((person) => person.valid)
    );
  }

  markFamilySetupTouched(): void {
    for (const person of this.peopleArray.controls) {
      person.controls.gender.markAsTouched();
      person.controls.birthYear.markAsTouched();
    }
    this.bumpPeopleVersion();
  }

  canVisitPerson(index: number): boolean {
    return index >= 0 && index <= this.highestReachedPersonIndex();
  }

  visitPerson(index: number): void {
    if (!this.canVisitPerson(index)) {
      return;
    }

    this.ensureQuestionnaireFor(index);
    this.currentPersonIndex.set(index);
    this.reviewMode.set(false);
    this.saveToStorage();
  }

  isPersonCompleted(index: number): boolean {
    const person = this.personAt(index);
    return !!person?.controls.completed.value;
  }

  markPersonIncomplete(index: number): void {
    const person = this.personAt(index);
    if (!person || !person.controls.completed.value) {
      return;
    }

    const id = this.personId(person);
    person.controls.completed.setValue(false, { emitEvent: false });
    this.setCompletedPersonId(id, false);
    this.reviewMode.set(false);
    this.syncPeopleState();
  }

  personStepStatus(index: number): PersonStepStatus {
    if (this.currentPersonIndex() === index && !this.reviewMode()) {
      return PersonStepStatusEnum.Active;
    }

    return this.isPersonCompleted(index)
      ? PersonStepStatusEnum.Completed
      : PersonStepStatusEnum.Inactive;
  }

  activePerson(): PersonGroup {
    return this.personAt(this.currentPersonIndex()) ?? this.peopleArray.at(0);
  }

  activeQuestionnaire(): QuestionnaireFormService {
    return this.activeQuestionnaireForCurrentPerson();
  }

  activeQuestionnaireForCurrentPerson(): QuestionnaireFormService {
    const index = this.currentPersonIndex();
    const person = this.personAt(index) ?? this.activePerson();
    const id = this.personId(person);
    const cached = this.activeQuestionnaireCache;

    if (cached && cached.index === index && cached.id === id) {
      this.syncApplicantGender(id, cached.service, person.controls.gender.value);
      return cached.service;
    }

    return this.ensureQuestionnaireFor(index);
  }

  ensureQuestionnaireFor(index: number): QuestionnaireFormService {
    const person = this.personAt(index) ?? this.activePerson();
    const id = this.personId(person);
    let questionnaire = this.questionnaireServices.get(id);

    if (!questionnaire) {
      questionnaire = new QuestionnaireFormService(this.i18n);
      const stored = this.storedQuestionnaires.get(id);
      if (stored) {
        this.restoreQuestionnaire(questionnaire, stored);
      }
      this.questionnaireServices.set(id, questionnaire);
      this.questionnaireSubscriptions.set(
        id,
        questionnaire.form.valueChanges
          .pipe(auditTime(120))
          .subscribe(() => this.syncPeopleState()),
      );
    }

    this.syncApplicantGender(id, questionnaire, person.controls.gender.value);
    if (index === this.currentPersonIndex()) {
      this.activeQuestionnaireCache = { index, id, service: questionnaire };
    }
    return questionnaire;
  }

  finalizeCurrentPerson(): FinalizePersonResult {
    const questionnaire = this.activeQuestionnaire();
    if (!questionnaire.submitValue()) {
      this.reviewMode.set(false);
      return 'invalid';
    }

    const person = this.activePerson();
    person.controls.completed.setValue(true);
    const id = this.personId(person);
    this.setCompletedPersonId(id, true);

    if (this.currentPersonIndex() < this.peopleArray.length - 1) {
      const nextIndex = this.currentPersonIndex() + 1;
      this.ensureQuestionnaireFor(nextIndex);
      this.currentPersonIndex.set(nextIndex);
      this.highestReachedPersonIndex.set(Math.max(this.highestReachedPersonIndex(), nextIndex));
      this.reviewMode.set(false);
      this.syncPeopleState();
      return 'advanced';
    }

    this.reviewMode.set(true);
    this.syncPeopleState();
    return 'review';
  }

  allPeopleCompleted(): boolean {
    return (
      this.peopleArray.length > 0 && this.completedPersonIds().size === this.peopleArray.length
    );
  }

  enterReviewMode(): void {
    if (!this.allPeopleCompleted()) {
      this.reviewMode.set(false);
      return;
    }

    this.reviewMode.set(true);
    this.syncPeopleState();
  }

  overallQuestionnaireProgress(): number {
    this.peopleVersion();

    if (this.peopleArray.length === 0) {
      return 0;
    }

    const total = this.peopleArray.controls.reduce((sum, person) => {
      if (person.controls.completed.value) {
        return sum + 1;
      }

      const id = this.personId(person);
      const questionnaire = this.questionnaireServices.get(id);
      return sum + (questionnaire?.completionRatio() ?? 0);
    }, 0);

    return Math.max(0, Math.min(total / this.peopleArray.length, 1));
  }

  submitDeclaration(): boolean {
    if (!this.allPeopleCompleted()) {
      this.form.markAllAsTouched();
      return false;
    }

    this.clearStoredData();
    return true;
  }

  reviewDashboard(scope: ReviewPersonScope = 'all', recipientEmail = ''): ReviewDashboard {
    this.peopleVersion();

    return buildReviewDashboard({
      people: this.snapshotPeople(),
      familyLocation: this.familyLocation(),
      translate: this.translateForReport(),
      recipientEmail,
      scope,
    });
  }

  avatarSrc(person: PersonGroup): string {
    const gender = person.controls.gender.value;
    const rawYear = person.controls.birthYear.value.trim();
    const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
    const age = year === null ? null : new Date().getFullYear() - year;
    const ageBand = this.avatarAgeBand(gender, age);

    if (ageBand === AvatarAgeBand.Baby || ageBand === AvatarAgeBand.Unknown) {
      return AVATAR_ASSETS[ageBand];
    }

    return AVATAR_ASSETS[ageBand][
      gender === PersonGenderEnum.Female ? PersonGenderEnum.Female : PersonGenderEnum.Male
    ];
  }

  private translateForReport(): (
    key: string,
    params?: Record<string, string | number | null | undefined>,
  ) => string {
    return (key, params) => this.i18n.translate(key, params);
  }

  private avatarAgeBand(gender: PersonGender, age: number | null): AvatarAgeBand {
    if (gender === PersonGenderEnum.Baby || (age !== null && age < 4)) {
      return AvatarAgeBand.Baby;
    }

    if (age === null) {
      return AvatarAgeBand.Unknown;
    }

    if (age < 18) {
      return AvatarAgeBand.Child;
    }

    return age < 60 ? AvatarAgeBand.Adult : AvatarAgeBand.Senior;
  }

  private createPerson(data?: StoredPersonData): PersonGroup {
    const id = data?.id ?? this.generatePersonId();
    return new FormGroup<PersonControls>(
      {
        id: new FormControl(id, { nonNullable: true }),
        completed: new FormControl(data?.completed ?? false, { nonNullable: true }),
        gender: new FormControl<PersonGender>(data?.gender ?? PersonGenderEnum.Unknown, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        birthYear: new FormControl(data?.birthYear ?? '', {
          nonNullable: true,
          validators: [Validators.required, Validators.pattern(/^\d{4}$/), this.birthYearValidator],
        }),
      },
      { validators: this.babyAgeValidator },
    );
  }

  private generatePersonId(): string {
    const id = `person-${this.nextPersonId}`;
    this.nextPersonId += 1;
    return id;
  }

  private birthYearValidator(
    control: AbstractControl<string>,
  ): { [ValidationErrorKey.BirthYear]: true } | null {
    const value = control.value.trim();
    if (!/^\d{4}$/.test(value)) {
      return { [ValidationErrorKey.BirthYear]: true };
    }

    const year = Number(value);
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear ? null : { [ValidationErrorKey.BirthYear]: true };
  }

  private babyAgeValidator(group: AbstractControl): { [ValidationErrorKey.BabyAge]: true } | null {
    const gender = group.get('gender')?.value;
    const rawYear = group.get('birthYear')?.value;
    if (
      gender !== PersonGenderEnum.Baby ||
      typeof rawYear !== 'string' ||
      !/^\d{4}$/.test(rawYear.trim())
    ) {
      return null;
    }

    const year = Number(rawYear.trim());
    const currentYear = new Date().getFullYear();
    const allowedPreviousYear = new Date().getMonth() + 1 <= 9;
    return year === currentYear || (allowedPreviousYear && year === currentYear - 1)
      ? null
      : { [ValidationErrorKey.BabyAge]: true };
  }

  private syncApplicantGender(
    id: string,
    questionnaire: QuestionnaireFormService,
    gender: PersonGender,
  ): void {
    if (this.syncedApplicantGenders.get(id) === gender) {
      return;
    }

    questionnaire.setApplicantGender(this.genderOption(gender));
    this.syncedApplicantGenders.set(id, gender);
  }

  private genderOption(gender: PersonGender): OptionValue<GenderEnum> {
    if (gender === PersonGenderEnum.Female) {
      return { value: GenderEnum.Female, label: 'Female' };
    }
    if (gender === PersonGenderEnum.Male) {
      return { value: GenderEnum.Male, label: 'Male' };
    }
    return { value: GenderEnum.Other, label: 'Other' };
  }

  private restoreQuestionnaire(questionnaire: QuestionnaireFormService, raw: unknown): void {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    const value = raw as Record<string, unknown>;
    const diagnoses = Array.isArray(value['diagnoses']) ? value['diagnoses'] : [];
    const { diagnoses: _diagnoses, ...rest } = value;
    questionnaire.form.patchValue(rest, { emitEvent: false });
    questionnaire.form.controls.diagnoses.clear({ emitEvent: false });

    for (const diagnosis of diagnoses) {
      if (!diagnosis || typeof diagnosis !== 'object') {
        continue;
      }
      const questionId = (diagnosis as Record<string, unknown>)['questionId'] as
        | DiagnosisQuestionId
        | undefined;
      if (!questionId) {
        continue;
      }
      const entry = questionnaire.addDiagnosis(questionId);
      entry.patchValue(this.normalizeDiagnosisDates(diagnosis as Record<string, unknown>), {
        emitEvent: false,
      });
    }

    questionnaire.refreshValidationState();
  }

  private normalizeDiagnosisDates(diagnosis: Record<string, unknown>): Record<string, unknown> {
    return {
      ...diagnosis,
      from: this.normalizeFullDate(diagnosis['from']),
      to: this.normalizeFullDate(diagnosis['to']),
    };
  }

  private normalizeFullDate(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      return `${value}-01`;
    }

    return value;
  }

  private saveToStorage(): void {
    if (this.restoring) {
      return;
    }

    try {
      const data: StoredDeclarationData = {
        version: HEALTH_DECLARATION_STORAGE_VERSION,
        people: this.snapshotPeople(),
        currentPersonIndex: this.currentPersonIndex(),
        highestReachedPersonIndex: this.highestReachedPersonIndex(),
        reviewMode: this.reviewMode(),
        completedPersonIds: Array.from(this.completedPersonIds()),
        nextPersonId: this.nextPersonId,
        familyLocation: this.familyLocation(),
        familyLocationQuery: this.familyLocationQuery(),
        timestamp: Date.now(),
      };

      writeHealthDeclarationDraft(data);
    } catch {
      // Storage can be unavailable in private browsing or tests.
    }
  }

  private snapshotPeople(): StoredPersonData[] {
    return this.peopleArray.controls.map((person) => {
      const id = this.personId(person);
      return {
        ...person.getRawValue(),
        questionnaire:
          this.questionnaireServices.get(id)?.form.getRawValue() ??
          this.storedQuestionnaires.get(id),
      };
    });
  }

  private restoreFromStorage(): void {
    try {
      const data = readHealthDeclarationDraft<StoredDeclarationData>();
      if (!data) {
        return;
      }

      this.restoring = true;
      this.activeQuestionnaireCache = null;
      this.syncedApplicantGenders.clear();
      this.peopleArray.clear({ emitEvent: false });
      for (const personData of data.people ?? []) {
        const person = this.createPerson(personData);
        this.peopleArray.push(person, { emitEvent: false });
        if (personData.id && personData.questionnaire) {
          this.storedQuestionnaires.set(personData.id, personData.questionnaire);
        }
      }

      this.currentPersonIndex.set(
        Math.min(data.currentPersonIndex ?? 0, Math.max(this.peopleArray.length - 1, 0)),
      );
      this.highestReachedPersonIndex.set(
        Math.min(data.highestReachedPersonIndex ?? 0, Math.max(this.peopleArray.length - 1, 0)),
      );
      this.reviewMode.set(data.reviewMode ?? false);
      const validPersonIds = new Set(
        this.peopleArray.controls.map((person) => this.personId(person)),
      );
      const completedIds = (data.completedPersonIds ?? []).filter((id) => validPersonIds.has(id));
      this.completedPersonIds.set(new Set(completedIds));
      for (const person of this.peopleArray.controls) {
        if (!this.completedPersonIds().has(this.personId(person))) {
          person.controls.completed.setValue(false, { emitEvent: false });
        }
      }
      this.nextPersonId = data.nextPersonId ?? this.nextPersonId;
      this.familyLocation.set(data.familyLocation ?? null);
      this.familyLocationQuery.set(data.familyLocationQuery ?? '');
      this.restoring = false;
      this.bumpPeopleVersion();
    } catch {
      this.restoring = false;
      this.clearStoredData();
    }
  }

  private clearStoredData(): void {
    clearHealthDeclarationDraft();
  }

  private destroyQuestionnaireServices(): void {
    for (const service of this.questionnaireServices.values()) {
      service.destroy();
    }
    for (const subscription of this.questionnaireSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.questionnaireServices.clear();
    this.questionnaireSubscriptions.clear();
    this.syncedApplicantGenders.clear();
    this.activeQuestionnaireCache = null;
  }

  private setCompletedPersonId(id: string, completed: boolean): void {
    this.completedPersonIds.update((existing) => {
      if (existing.has(id) === completed) {
        return existing;
      }

      const next = new Set(existing);
      if (completed) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  private syncPeopleState(): void {
    this.bumpPeopleVersion();
    this.saveToStorage();
  }

  private bumpPeopleVersion(): void {
    this.peopleVersion.update((version) => version + 1);
  }
}
