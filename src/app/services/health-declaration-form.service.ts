import { Injectable, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { auditTime } from 'rxjs';

import {
  Gender as GenderEnum,
  type DiagnosisQuestionIdValue as DiagnosisQuestionId,
  PersonGender as PersonGenderEnum,
  type PersonGenderValue,
  PersonStepStatus as PersonStepStatusEnum,
  type PersonStepStatusValue,
} from '../constants/app-enums';
import { OptionValue } from '../components/form-controls';
import { QuestionnaireFormService } from '../components/pages/questions/questionnaire-form.service';
import { LocationFilterResponse } from './location.service';

export type PersonGender = PersonGenderValue;
export type YesNoAnswer = '' | 'yes' | 'no';
export type PersonStepStatus = PersonStepStatusValue;
export type FinalizePersonResult = 'invalid' | 'advanced' | 'review';

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

type StoredPersonData = {
  id?: string;
  completed?: boolean;
  gender?: PersonGender;
  birthYear?: string;
  questionnaire?: unknown;
};

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

type HealthDeclarationSubmissionFile = StoredDeclarationData & {
  fileName: string;
  submittedAt: string;
};

type QuestionAnswerRow = [question: string, answer: unknown];

const STORAGE_KEY = 'my-app-health-declaration';
const STORAGE_VERSION = 1;
const STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const QUESTION_ANSWER_LABELS: Record<string, string> = {
  applicantGender: 'Applicant gender',
  'previousInsurance.q1':
    '1. Wurden bereits Anträge von SWICA oder von anderen Versicherern abgelehnt, zurückgestellt oder nur zu erschwerten Bedingungen angenommen?',
  'previousInsurance.q1a': 'Wenn ja, weshalb und aufgrund welcher Diagnose?',
  'previousInsurance.q1b': 'Bestehen noch Beschwerden oder folgen noch Behandlungen?',
  'doctorInfo.practiceName': '2. Praxis/Spital',
  'doctorInfo.familyName': '2. Name',
  'doctorInfo.givenNames': '2. Vorname',
  'doctorInfo.street': '2. Strasse',
  'doctorInfo.streetNumber': '2. Nr.',
  'doctorInfo.postalCode': '2. PLZ',
  'doctorInfo.city': '2. Ort',
  'bodyMetrics.heightCm': '3. Grösse (cm)',
  'bodyMetrics.weightKg': '3. Gewicht (kg)',
  'questionAnswers.q4': '4. Behandlung, Kontrolle oder Abklärung in den letzten 12 Monaten',
  'questionAnswers.q4a': '4. Welche Behandlungen?',
  'questionAnswers.q4b': '4. Bestehen noch Beschwerden oder folgen noch Behandlungen?',
  'questionAnswers.q5': '5. Krankheiten/Störungen/Beschwerden in den letzten 10 Jahren',
  'questionAnswers.q6': '6. Tumorerkrankung, Bandscheibenvorfall, psychische Krankheit oder Herz-Kreislauf-Erkrankung',
  'questionAnswers.q8': '7. Ambulanter oder stationärer Eingriff/Operation',
  'questionAnswers.q7': '8. Unfall mit chirurgischem Eingriff oder langer Behandlung',
  'questionAnswers.q9': '9. Geburtsgebrechen oder UVG-/IV-Rente',
  'questionAnswers.q9a': '9. Welches Geburtsgebrechen oder Grund der Rente?',
  'questionAnswers.q10': '10. Zahn- oder Kieferfehlstellung',
  'questionAnswers.q10a': '10. Kieferorthopädische Arbeiten zu erwarten?',
  'questionAnswers.q11': '11. Schwangerschaft',
  'questionAnswers.q12': '12. Medikamente/Nahrungsergänzungen in den letzten 5 Jahren',
  'questionAnswers.q12a': '12. Relevante Medikamente/Diagnosen',
  'questionAnswers.q13': '13. Nikotin, Alkohol, Drogen oder Ähnliches',
  'questionAnswers.q16': '16. Parodontitis',
  'questionAnswers.q17': '17. Zahnstellungs- und kieferanomalien',
  'lifestyle.nicotineUse': '13. Nikotin',
  'lifestyle.nicotineUnits': '13. Nikotin Stückzahl/Einheiten',
  'lifestyle.nicotineFrequency': '13. Nikotin pro Tag/Woche/Monat/Jahr',
  'lifestyle.nicotineFrom': '13. Nikotin Dauer von',
  'lifestyle.nicotineTo': '13. Nikotin bis',
  'lifestyle.alcoholUse': '13. Alkohol',
  'lifestyle.alcoholUnits': '13. Alkohol Stückzahl/Einheiten',
  'lifestyle.alcoholFrequency': '13. Alkohol pro Tag/Woche/Monat/Jahr',
  'lifestyle.alcoholFrom': '13. Alkohol Dauer von',
  'lifestyle.alcoholTo': '13. Alkohol bis',
  'lifestyle.drugUse': '13. Drogen',
  'lifestyle.drugUnits': '13. Drogen Stückzahl/Einheiten',
  'lifestyle.drugFrequency': '13. Drogen pro Tag/Woche/Monat/Jahr',
  'lifestyle.drugFrom': '13. Drogen Dauer von',
  'lifestyle.drugTo': '13. Drogen bis',
  'dentalInfo.pregnancyDate': '11. Geburtstermin',
  'dentalInfo.pregnancyWeightBefore': '11. Gewicht vor Schwangerschaft',
  'dentalInfo.desiredLevel': '14. Gewünschte Stufe DENTA',
  'dentalInfo.toothStatusNotes': '15. Befund vom',
  'dentalInfo.toothStatusUpper': '15. Zahnschema oben',
  'dentalInfo.toothStatusLower': '15. Zahnschema unten',
  'dentalInfo.findingDate': '15. Befund Datum',
  'dentalInfo.prosthesesCondition': '15. Zustand der Kronen, Brücken und Prothesen',
  'dentalInfo.prosthesesReason': '15. Wenn mittelmässig oder schlecht, weshalb?',
  'dentalInfo.parodontitisBleeding': '16. Zahnfleischbluten',
  'dentalInfo.parodontitisUpper': '16. Parodontitis Zahnschema oben',
  'dentalInfo.parodontitisLower': '16. Parodontitis Zahnschema unten',
  'dentalInfo.parodontitisRemarks': '16. Bemerkungen',
  'dentalInfo.jawDescription': '17. Beschreibung',
  'dentalInfo.angleClass': '17. Angle-Klasse',
  'dentalInfo.jawExpectedWork': '17. Sind kieferorthopädische Arbeiten zu erwarten?',
  'dentalInfo.jawReason': '17. Wenn ja, warum?',
  'dentalInfo.jawTreatments': '17. Welche Behandlungen?',
  'dentalInfo.jawCostEstimate': '17. Kostenschätzung',
  'dentalInfo.hygiene': '18.1 Hygiene',
  'dentalInfo.hygieneReason': '18.1a Wenn mittelmässig oder schlecht, weshalb?',
  'dentalInfo.lastTreatment': '18.2 Letzte Behandlung und Grund',
  'dentalInfo.firstTreatment': '18.3 Erste Behandlung',
  'dentalInfo.dentalInsuranceExam': '18.4 Untersuchung für Zahnversicherung',
  'dentalInfo.accidentDentalInjuries': '18.5 Unfallbedingte Zahnschäden',
  'dentalInfo.accidentAffectedTeeth': '18.6 Betroffene Zähne',
  'dentalInfo.accidentTreatments': '18.7 Unfallbehandlungen',
  'dentalInfo.dentalProceduresPlanned': '18.8 Zahnärztliche Arbeiten geplant oder erforderlich',
  'dentalInfo.plannedProcedures': '18.9 Welche geplanten Arbeiten?',
  'dentalInfo.plannedTreatmentDate': '18.10 Wann wird diese Behandlung durchgeführt?',
  'dentalInfo.treatmentDelayReason': '18.11 Weshalb konnte die Behandlung nicht vorher durchgeführt werden?',
  'dentalInfo.plannedDentalCost': '18.12 Kostenschätzung',
  'diagnoses.questionId': 'Question',
  'diagnoses.condition': 'Diagnose/Krankheiten/Störungen/Beschwerden',
  'diagnoses.from': 'Beginn (Monat/Jahr)',
  'diagnoses.to': 'Ende (Monat/Jahr)',
  'diagnoses.recovered': 'Vollständig geheilt?',
  'diagnoses.doctorGivenNames': 'Behandelnde/r Arzt/Ärztin, Therapeut/in Vorname',
  'diagnoses.doctorFamilyName': 'Behandelnde/r Arzt/Ärztin, Therapeut/in Name',
  'diagnoses.doctorStreet': 'Arzt/Therapeut Strasse',
  'diagnoses.doctorStreetNumber': 'Arzt/Therapeut Nr.',
  'diagnoses.doctorPostalCode': 'Arzt/Therapeut PLZ',
  'diagnoses.doctorCity': 'Arzt/Therapeut Ort',
  'diagnoses.notes': 'Besondere Bemerkungen',
  'diagnoses.implantAnswer': 'Implantat oder Fremdkörper eingesetzt?',
  'diagnoses.implantDetails': 'Was und wo?',
  'diagnoses.implantStatus': 'Implantat/Fremdkörper Status',
  'diagnoses.name': 'Name',
  'diagnoses.amountPerDay': 'Anzahl/Tag',
  'diagnoses.duration': 'Duration',
};

@Injectable({ providedIn: 'root' })
export class HealthDeclarationFormService {
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
  private readonly questionnaireSubscriptions = new Map<string, ReturnType<QuestionnaireFormService['form']['valueChanges']['subscribe']>>();
  private readonly syncedApplicantGenders = new Map<string, PersonGender>();
  private readonly humanizedLabelCache = new Map<string, string>();
  private activeQuestionnaireCache:
    | {
        index: number;
        id: string;
        service: QuestionnaireFormService;
      }
    | null = null;
  private restoring = false;
  private submissionLogged = false;

  constructor() {
    this.restoreFromStorage();

    if (this.peopleArray.length === 0) {
      this.peopleArray.push(this.createPerson());
    }

    this.peopleArray.valueChanges
      .pipe(auditTime(250))
      .subscribe(() => this.syncPeopleState());
    this.peopleArray.statusChanges
      .pipe(auditTime(250))
      .subscribe(() => this.bumpPeopleVersion());
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
    this.submissionLogged = false;
    this.restoring = false;
    this.bumpPeopleVersion();
    this.clearStoredData();
  }

  addPerson(): PersonGroup {
    const person = this.createPerson();
    this.peopleArray.push(person);
    this.reviewMode.set(false);
    this.submissionLogged = false;
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
    this.submissionLogged = false;
    this.setCompletedPersonId(id, false);

    const nextCurrentIndex = Math.min(this.currentPersonIndex(), this.peopleArray.length - 1);
    this.currentPersonIndex.set(Math.max(0, nextCurrentIndex));
    this.highestReachedPersonIndex.set(Math.min(this.highestReachedPersonIndex(), this.peopleArray.length - 1));
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
    return this.familyLocation() !== null && this.peopleArray.length > 0 && this.peopleArray.controls.every((person) => person.valid);
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
    this.submissionLogged = false;
    this.setCompletedPersonId(id, false);
    this.reviewMode.set(false);
    this.syncPeopleState();
  }

  personStepStatus(index: number): PersonStepStatus {
    if (this.currentPersonIndex() === index && !this.reviewMode()) {
      return PersonStepStatusEnum.Active;
    }

    return this.isPersonCompleted(index) ? PersonStepStatusEnum.Completed : PersonStepStatusEnum.Inactive;
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
      questionnaire = new QuestionnaireFormService();
      const stored = this.storedQuestionnaires.get(id);
      if (stored) {
        this.restoreQuestionnaire(questionnaire, stored);
      }
      this.questionnaireServices.set(id, questionnaire);
      this.questionnaireSubscriptions.set(
        id,
        questionnaire.form.valueChanges.pipe(auditTime(250)).subscribe(() => this.saveToStorage()),
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
    this.logSubmissionFiles();
    this.syncPeopleState();
    return 'review';
  }

  allPeopleCompleted(): boolean {
    return this.peopleArray.length > 0 && this.completedPersonIds().size === this.peopleArray.length;
  }

  submitDeclaration(): boolean {
    if (!this.allPeopleCompleted()) {
      this.form.markAllAsTouched();
      return false;
    }

    this.logSubmissionFiles();
    this.clearStoredData();
    return true;
  }

  avatarSrc(person: PersonGroup): string {
    const gender = person.controls.gender.value;
    const rawYear = person.controls.birthYear.value.trim();
    const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
    const age = year === null ? null : new Date().getFullYear() - year;

    if (gender === PersonGenderEnum.Baby || (age !== null && age < 4)) {
      return 'assets/babyIcon.png';
    }
    if (age !== null && age < 18) {
      return gender === PersonGenderEnum.Female ? 'assets/avatar_kid_4.png' : 'assets/avatar_kid_3.png';
    }
    if (age !== null && age < 60) {
      return gender === PersonGenderEnum.Female ? 'assets/avatar_adult_4.png' : 'assets/avatar_adult_3.png';
    }
    if (age !== null && age >= 60) {
      return gender === PersonGenderEnum.Female ? 'assets/avatar_elder_4.png' : 'assets/avatar_elder_3.png';
    }
    return 'assets/avatar_user.svg';
  }

  private createPerson(data?: StoredPersonData): PersonGroup {
    const id = data?.id ?? this.generatePersonId();
    return new FormGroup<PersonControls>(
      {
        id: new FormControl(id, { nonNullable: true }),
        completed: new FormControl(data?.completed ?? false, { nonNullable: true }),
        gender: new FormControl<PersonGender>(data?.gender ?? PersonGenderEnum.Unknown, { nonNullable: true, validators: [Validators.required] }),
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

  private birthYearValidator(control: AbstractControl<string>): { birthYear: true } | null {
    const value = control.value.trim();
    if (!/^\d{4}$/.test(value)) {
      return { birthYear: true };
    }

    const year = Number(value);
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear ? null : { birthYear: true };
  }

  private babyAgeValidator(group: AbstractControl): { babyAge: true } | null {
    const gender = group.get('gender')?.value;
    const rawYear = group.get('birthYear')?.value;
    if (gender !== PersonGenderEnum.Baby || typeof rawYear !== 'string' || !/^\d{4}$/.test(rawYear.trim())) {
      return null;
    }

    const year = Number(rawYear.trim());
    const currentYear = new Date().getFullYear();
    const allowedPreviousYear = new Date().getMonth() + 1 <= 9;
    return year === currentYear || (allowedPreviousYear && year === currentYear - 1) ? null : { babyAge: true };
  }

  private syncApplicantGender(id: string, questionnaire: QuestionnaireFormService, gender: PersonGender): void {
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
      const questionId = (diagnosis as Record<string, unknown>)['questionId'] as DiagnosisQuestionId | undefined;
      if (!questionId) {
        continue;
      }
      const entry = questionnaire.addDiagnosis(questionId);
      entry.patchValue(this.normalizeDiagnosisDates(diagnosis as Record<string, unknown>), { emitEvent: false });
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
        version: STORAGE_VERSION,
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable in private browsing or tests.
    }
  }

  private buildSubmissionFile(submittedAt: string, people = this.snapshotPeople()): HealthDeclarationSubmissionFile {
    return {
      fileName: 'health-declaration.json',
      submittedAt,
      version: STORAGE_VERSION,
      people,
      currentPersonIndex: this.currentPersonIndex(),
      highestReachedPersonIndex: this.highestReachedPersonIndex(),
      reviewMode: this.reviewMode(),
      completedPersonIds: Array.from(this.completedPersonIds()),
      nextPersonId: this.nextPersonId,
      familyLocation: this.familyLocation(),
      familyLocationQuery: this.familyLocationQuery(),
      timestamp: Date.now(),
    };
  }

  private buildQuestionAnswerFile(submittedAt: string, people = this.snapshotPeople()): QuestionAnswerRow[][] {
    return people.map((person) => {
      const rows: QuestionAnswerRow[] = [
        ['submittedAt', submittedAt],
        ['person.id', person.id],
        ['person.gender', person.gender],
        ['person.birthYear', person.birthYear],
      ];
      this.appendQuestionAnswers(rows, person.questionnaire);
      return rows;
    });
  }

  private logSubmissionFiles(): void {
    if (this.submissionLogged || !this.allPeopleCompleted()) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const people = this.snapshotPeople();
    const fullSubmission = this.buildSubmissionFile(submittedAt, people);
    const questionAnswers = this.buildQuestionAnswerFile(submittedAt, people);
    const fullJson = JSON.stringify(fullSubmission, null, 2);
    const questionAnswerJson = JSON.stringify(questionAnswers, null, 2);

    console.log('health-declaration.json', fullJson);
    console.log('health-declaration-question-answers.json', questionAnswerJson);
    this.exposeSubmissionFiles(fullSubmission, questionAnswers, fullJson, questionAnswerJson);
    this.submissionLogged = true;
  }

  private exposeSubmissionFiles(
    fullSubmission: HealthDeclarationSubmissionFile,
    questionAnswers: QuestionAnswerRow[][],
    fullJson: string,
    questionAnswerJson: string,
  ): void {
    const target = globalThis as typeof globalThis & {
      healthDeclarationJson?: HealthDeclarationSubmissionFile;
      healthDeclarationQuestionAnswersJson?: QuestionAnswerRow[][];
    };
    target.healthDeclarationJson = fullSubmission;
    target.healthDeclarationQuestionAnswersJson = questionAnswers;

    try {
      sessionStorage.setItem('health-declaration.json', fullJson);
      sessionStorage.setItem('health-declaration-question-answers.json', questionAnswerJson);
    } catch {
      // Session storage can be unavailable in private browsing or tests.
    }
  }

  private snapshotPeople(): StoredPersonData[] {
    return this.peopleArray.controls.map((person) => {
      const id = this.personId(person);
      return {
        ...person.getRawValue(),
        questionnaire: this.questionnaireServices.get(id)?.form.getRawValue() ?? this.storedQuestionnaires.get(id),
      };
    });
  }

  private appendQuestionAnswers(rows: QuestionAnswerRow[], value: unknown, prefix = ''): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return;
    }

    for (const [key, answer] of Object.entries(value)) {
      if (key === 'id') {
        continue;
      }

      const path = prefix ? `${prefix}.${key}` : key;
      this.appendAnswerValue(rows, path, answer);
    }
  }

  private appendAnswerValue(rows: QuestionAnswerRow[], path: string, answer: unknown): void {
    if (this.isBlankAnswer(answer)) {
      return;
    }

    if (this.isOptionValue(answer)) {
      rows.push([this.questionLabel(path), answer.label]);
      return;
    }

    if (Array.isArray(answer)) {
      let hasRecordItems = false;
      for (const item of answer) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          hasRecordItems = true;
          break;
        }
      }

      if (!hasRecordItems) {
        rows.push([this.questionLabel(path), answer]);
        return;
      }

      for (let index = 0; index < answer.length; index += 1) {
        const item = answer[index];
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          this.appendQuestionAnswers(rows, item, `${path}.${index + 1}`);
        }
      }
      return;
    }

    if (typeof answer === 'object' && answer !== null) {
      this.appendQuestionAnswers(rows, answer, path);
      return;
    }

    rows.push([this.questionLabel(path), this.formatPrimitiveAnswer(answer)]);
  }

  private questionLabel(path: string): string {
    const diagnosisMatch = path.match(/^diagnoses\.(\d+)\.(.+)$/);
    if (diagnosisMatch) {
      const [, index, field] = diagnosisMatch;
      return `Diagnosis ${index} - ${QUESTION_ANSWER_LABELS[`diagnoses.${field}`] ?? this.humanizedLabel(field)}`;
    }

    return QUESTION_ANSWER_LABELS[path] ?? this.humanizedLabel(path);
  }

  private humanizedLabel(path: string): string {
    const cached = this.humanizedLabelCache.get(path);
    if (cached) {
      return cached;
    }

    const label = path.split('.').at(-1) ?? path;
    const humanized = label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
    this.humanizedLabelCache.set(path, humanized);
    return humanized;
  }

  private formatPrimitiveAnswer(answer: unknown): unknown {
    if (typeof answer === 'boolean') {
      return answer ? 'Ja' : 'Nein';
    }

    return answer;
  }

  private isBlankAnswer(answer: unknown): boolean {
    if (answer === null || answer === undefined || answer === '') {
      return true;
    }

    return Array.isArray(answer) && answer.length === 0;
  }

  private isOptionValue(answer: unknown): answer is OptionValue {
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
      return false;
    }

    const record = answer as Record<string, unknown>;
    return typeof record['label'] === 'string' && 'value' in record;
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored) as StoredDeclarationData;
      const timestamp = typeof data.timestamp === 'number' ? data.timestamp : 0;
      if (data.version !== STORAGE_VERSION || Date.now() - timestamp > STORAGE_MAX_AGE_MS) {
        this.clearStoredData();
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

      this.currentPersonIndex.set(Math.min(data.currentPersonIndex ?? 0, Math.max(this.peopleArray.length - 1, 0)));
      this.highestReachedPersonIndex.set(Math.min(data.highestReachedPersonIndex ?? 0, Math.max(this.peopleArray.length - 1, 0)));
      this.reviewMode.set(data.reviewMode ?? false);
      const validPersonIds = new Set(this.peopleArray.controls.map((person) => this.personId(person)));
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
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
