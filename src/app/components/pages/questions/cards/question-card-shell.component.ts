import { Component, Directive, computed, effect, inject, input, output, signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { DateInputComponent, OptionToggleComponent, TextAreaComponent, TextInputComponent, YesNoToggleComponent } from '../../../form-controls';
import { LocationFilterResponse, LocationService } from '../../../../services/location.service';
import { DiagnosisEntryGroup, DiagnosisQuestionId, YesNoControl } from '../questionnaire.types';
import { QuestionnaireFormService } from '../questionnaire-form.service';

@Component({
  selector: 'app-question-card-shell',
  standalone: true,
  templateUrl: './question-card-shell.component.html',
  host: { class: 'block' },
})
export class QuestionCardShellComponent {
  number = input('');
  title = input.required<string>();
  description = input('');
  disabled = input(false);
}

@Directive()
export abstract class YesNoQuestionCardBase {
  control = input.required<YesNoControl>();
  number = input.required<string>();
  title = input.required<string>();
  description = input('');
  disabled = input(false);

  private readonly stateVersion = signal(0);

  isYes = computed(() => {
    this.stateVersion();
    return this.control().value?.value === true;
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() => {
        this.stateVersion.update((version) => version + 1);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
}

@Component({
  selector: 'app-binary-question-card',
  standalone: true,
  imports: [YesNoToggleComponent, QuestionCardShellComponent],
  templateUrl: './binary-question-card.component.html',
})
export class BinaryQuestionCardComponent extends YesNoQuestionCardBase {}

export type DiagnosisEntryVariant = 'standard' | 'operation' | 'medication';

@Component({
  selector: 'app-diagnosis-entry',
  standalone: true,
  imports: [
    TextAreaComponent,
    TextInputComponent,
    DateInputComponent,
    YesNoToggleComponent,
    OptionToggleComponent,
  ],
  templateUrl: '../diagnosis/diagnosis-entry.component.html',
  styles: [`
    .diagnosis-location {
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    .diagnosis-location:focus-within {
      z-index: 120;
    }

    .diagnosis-location__field {
      display: grid;
      min-width: 0;
      gap: 0.25rem;
    }

    .diagnosis-location__control {
      position: relative;
      min-width: 0;
    }

    .diagnosis-location__label {
      color: #706876;
      font-size: 12px;
      font-weight: 300;
      line-height: 1.4;
    }

    .diagnosis-location__input {
      display: block;
      width: 100%;
      height: var(--control-height);
      min-height: var(--control-height);
      padding: 10px;
      border: 1px solid #cabadc;
      border-radius: 11px;
      background: #e6d9f4;
      color: #08050c;
      font: inherit;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.2;
      outline: none;
      transition:
        border-color 140ms ease,
        box-shadow 140ms ease;
    }

    .diagnosis-location__input::placeholder {
      color: #a996bd;
    }

    .diagnosis-location__input:focus,
    .diagnosis-location__input.is-valid {
      border-color: #8429ff;
      box-shadow: 0 0 0 4px rgba(125, 41, 222, 0.16);
    }

    .diagnosis-location__input.is-invalid {
      border-color: #d81837;
      box-shadow: 0 0 0 4px #eb000024;
    }

    .diagnosis-location__dropdown {
      position: absolute;
      top: calc(100% + 0.3rem);
      right: 0;
      left: 0;
      z-index: 200;
      max-height: 240px;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      border: 1px solid #8429ff;
      border-radius: 0.75rem;
      background: #ffffff;
      box-shadow: 0 14px 30px rgba(70, 24, 128, 0.18);
      list-style: none;
    }

    .diagnosis-location__option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 40px;
      padding: 0 0.85rem;
      border-bottom: 1px solid rgba(144, 114, 191, 0.15);
      color: #2d1748;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: background-color 140ms ease;
    }

    .diagnosis-location__option:last-child {
      border-bottom: 0;
    }

    .diagnosis-location__option:hover {
      background: #f0e6ff;
    }

    .diagnosis-location__option--status {
      justify-content: center;
      color: #6e38a6;
      cursor: default;
      pointer-events: none;
    }

    .diagnosis-location__zip {
      min-width: 3rem;
      color: #6e38a6;
    }

    .diagnosis-location__name {
      flex: 1;
      min-width: 0;
    }

    .diagnosis-location__canton {
      color: #8c49ff;
      font-size: 12px;
    }
  `],
  host: { class: 'block min-w-0 max-w-full overflow-visible' },
})
export class DiagnosisEntryComponent {
  formService = input.required<QuestionnaireFormService>();
  entry = input.required<DiagnosisEntryGroup>();
  index = input(0);
  canRemove = input(false);
  showHeader = input(true);
  variant = input<DiagnosisEntryVariant>('standard');
  remove = output<DiagnosisEntryGroup>();

  private stateVersion = signal(0);
  private readonly locationService = inject(LocationService);
  private readonly locationSearchSubject = new Subject<string>();
  private locationBlurCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly locationQuery = signal('');
  protected readonly locationResults = signal<LocationFilterResponse[]>([]);
  protected readonly locationDropdownOpen = signal(false);
  protected readonly locationLoading = signal(false);

  implantYes = computed(() => {
    this.stateVersion();
    return this.entry().controls.implantAnswer.value?.value === true;
  });

  locationInvalid = computed(() => {
    this.stateVersion();
    const entry = this.entry();
    const postalCode = entry.controls.doctorPostalCode;
    const city = entry.controls.doctorCity;
    return (postalCode.invalid && postalCode.touched) || (city.invalid && city.touched);
  });

  locationValid = computed(() => {
    this.stateVersion();
    const entry = this.entry();
    return entry.controls.doctorPostalCode.valid && entry.controls.doctorCity.valid && this.hasLocationValue(entry);
  });

  showLocationDropdown = computed(
    () =>
      this.locationDropdownOpen() &&
      this.canSearchLocations(this.locationQuery()) &&
      (this.locationLoading() || this.locationResults().length > 0),
  );

  entryTitle = computed(() => {
    const number = this.index() + 1;
    if (this.variant() === 'medication') {
      return `${number}) Bitte geben Sie alle zu dieser Frage relevanten Medikamenten/Diagnosen an:`;
    }
    if (this.variant() === 'operation') {
      return `${number}) Bitte geben Sie alle zu dieser Frage relevanten Diagnosen an:`;
    }
    return `${number}) Einzelheiten`;
  });

  dateOrderError = computed(() => {
    this.stateVersion();
    const entry = this.entry();
    return !!entry.errors?.['dateOrder'] && (entry.touched || entry.dirty);
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.entry().events.subscribe(() => {
        this.stateVersion.update((version) => version + 1);
        if (!this.locationDropdownOpen()) {
          this.syncLocationQueryFromEntry(this.entry());
        }
      });
      this.syncLocationQueryFromEntry(this.entry());
      onCleanup(() => subscription.unsubscribe());
    });

    effect((onCleanup) => {
      const subscription = this.locationSearchSubject
        .pipe(
          debounceTime(180),
          distinctUntilChanged(),
          switchMap((query) => {
            if (!this.canSearchLocations(query)) {
              this.locationLoading.set(false);
              return of([]);
            }

            this.locationLoading.set(true);
            return this.locationService.searchLocations(query).pipe(catchError(() => of([])));
          }),
        )
        .subscribe((locations) => {
          this.locationResults.set(locations);
          this.locationLoading.set(false);
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected onLocationInput(event: Event): void {
    this.cancelLocationBlurClose();
    const value = (event.target as HTMLInputElement).value;
    const entry = this.entry();
    this.locationQuery.set(value);
    entry.controls.doctorPostalCode.setValue(this.numericLocationPrefix(value));
    entry.controls.doctorCity.setValue(null);
    entry.controls.doctorPostalCode.markAsDirty();
    entry.controls.doctorCity.markAsDirty();

    if (!this.canSearchLocations(value)) {
      this.locationResults.set([]);
      this.locationDropdownOpen.set(false);
      this.locationLoading.set(false);
      return;
    }

    this.locationDropdownOpen.set(true);
    this.locationLoading.set(true);
    this.locationSearchSubject.next(value);
  }

  protected onLocationFocus(): void {
    this.cancelLocationBlurClose();
    if (this.canSearchLocations(this.locationQuery())) {
      this.locationDropdownOpen.set(true);
      this.locationSearchSubject.next(this.locationQuery());
    }
  }

  protected onLocationBlur(): void {
    const entry = this.entry();
    entry.controls.doctorPostalCode.markAsTouched();
    entry.controls.doctorCity.markAsTouched();
    this.locationBlurCloseTimeoutId = setTimeout(() => {
      this.locationDropdownOpen.set(false);
      this.syncLocationQueryFromEntry(entry);
    }, 140);
  }

  protected selectLocation(location: LocationFilterResponse, event?: Event): void {
    event?.preventDefault();
    this.cancelLocationBlurClose();
    const entry = this.entry();
    entry.controls.doctorPostalCode.setValue(location.zipCode);
    entry.controls.doctorCity.setValue(location.locationName);
    entry.controls.doctorPostalCode.markAsDirty();
    entry.controls.doctorCity.markAsDirty();
    entry.controls.doctorPostalCode.markAsTouched();
    entry.controls.doctorCity.markAsTouched();
    entry.controls.doctorPostalCode.updateValueAndValidity();
    entry.controls.doctorCity.updateValueAndValidity();
    this.locationQuery.set(this.locationDisplayValue(location));
    this.locationResults.set([]);
    this.locationDropdownOpen.set(false);
    this.locationLoading.set(false);
    this.stateVersion.update((version) => version + 1);
  }

  protected locationError(): string {
    const entry = this.entry();
    if (entry.controls.doctorPostalCode.hasError('required') || entry.controls.doctorCity.hasError('required')) {
      return 'PLZ / Ort is required.';
    }
    if (entry.controls.doctorPostalCode.hasError('postalCode')) {
      return 'PLZ must be 4 to 6 digits.';
    }
    return 'Please select a location from the list.';
  }

  private syncLocationQueryFromEntry(entry: DiagnosisEntryGroup): void {
    const zipCode = entry.controls.doctorPostalCode.value?.trim() ?? '';
    const city = entry.controls.doctorCity.value?.trim() ?? '';
    this.locationQuery.set([zipCode, city].filter(Boolean).join(' '));
  }

  private hasLocationValue(entry: DiagnosisEntryGroup): boolean {
    return !!entry.controls.doctorPostalCode.value?.trim() && !!entry.controls.doctorCity.value?.trim();
  }

  private canSearchLocations(query: string): boolean {
    return query.trim().length >= 2;
  }

  private numericLocationPrefix(value: string): string | null {
    const digits = value.trim().match(/^\d{1,6}/)?.[0] ?? '';
    return digits || null;
  }

  private locationDisplayValue(location: LocationFilterResponse): string {
    return `${location.zipCode} ${location.locationName}${location.cantonName ? `, ${location.cantonName}` : ''}`;
  }

  private cancelLocationBlurClose(): void {
    if (!this.locationBlurCloseTimeoutId) {
      return;
    }

    clearTimeout(this.locationBlurCloseTimeoutId);
    this.locationBlurCloseTimeoutId = null;
  }
}

@Component({
  selector: 'app-diagnosis-panel',
  standalone: true,
  imports: [DiagnosisEntryComponent],
  templateUrl: '../diagnosis/diagnosis-panel.component.html',
  host: { class: 'block' },
})
export class DiagnosisPanelComponent {
  formService = input.required<QuestionnaireFormService>();
  questionId = input.required<DiagnosisQuestionId>();
  disabled = input(false);

  private stateVersion = signal(0);
  protected readonly addAttempted = signal(false);

  entries = computed(() => {
    this.stateVersion();
    return this.formService().diagnosesFor(this.questionId());
  });

  minDiagnosisError = computed(() => {
    this.stateVersion();
    const errors = this.formService().form.controls.diagnoses.errors ?? {};
    return Object.prototype.hasOwnProperty.call(errors, `minDiagnosis_${this.questionId()}`);
  });

  addBlockedError = computed(() => {
    this.stateVersion();
    if (!this.addAttempted()) {
      return false;
    }

    return this.entries().some((entry) => entry.invalid);
  });

  variant = computed<DiagnosisEntryVariant>(() => {
    const questionId = this.questionId();
    if (questionId === 'Q8') {
      return 'operation';
    }
    if (questionId === 'Q12') {
      return 'medication';
    }
    return 'standard';
  });

  addButtonLabel = computed(() => (this.variant() === 'medication' ? '+ Weitere' : '+ Weitere Diagnose'));

  constructor() {
    effect((onCleanup) => {
      const subscription = this.formService().form.controls.diagnoses.events.subscribe(() => {
        this.stateVersion.update((version) => version + 1);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  addEntry(): void {
    if (!this.formService().validateDiagnosisEntriesFor(this.questionId())) {
      this.addAttempted.set(true);
      this.stateVersion.update((version) => version + 1);
      return;
    }

    this.addAttempted.set(false);
    this.formService().addDiagnosis(this.questionId());
    this.stateVersion.update((version) => version + 1);
  }

  removeEntry(entry: DiagnosisEntryGroup): void {
    this.formService().removeDiagnosis(entry);
    this.addAttempted.set(false);
    this.stateVersion.update((version) => version + 1);
  }
}

@Component({
  selector: 'app-diagnosis-question-card',
  standalone: true,
  imports: [YesNoToggleComponent, DiagnosisPanelComponent, QuestionCardShellComponent],
  templateUrl: './diagnosis-question-card.component.html',
})
export class DiagnosisQuestionCardComponent extends YesNoQuestionCardBase {
  formService = input.required<QuestionnaireFormService>();
  questionId = input.required<DiagnosisQuestionId>();
}
