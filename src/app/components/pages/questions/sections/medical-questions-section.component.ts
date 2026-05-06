import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import {
  DateInputComponent,
  NumberInputComponent,
  TextAreaComponent,
  TextInputComponent,
  YesNoToggleComponent,
} from '../../../form-controls';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { LocationFilterResponse, LocationService } from '../../../../services/location.service';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { BinaryQuestionCardComponent, DiagnosisQuestionCardComponent, QuestionCardShellComponent } from '../cards/question-card-shell.component';
import { DoctorInfoControls } from '../questionnaire.types';

@Component({
  selector: 'app-doctor-info-form',
  standalone: true,
  imports: [TextInputComponent, TranslatePipe],
  templateUrl: './doctor-info-form.component.html',
  styles: [`
    .doctor-location {
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    .doctor-location:focus-within {
      z-index: 120;
    }

    .doctor-location__label {
      display: block;
      min-width: 0;
      color: #706876;
      font-size: 12px;
      font-weight: 300;
      line-height: 1.18;
    }

    .doctor-location__control {
      position: relative;
      min-width: 0;
      margin-top: 0.25rem;
    }

    .doctor-location__input {
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

    .doctor-location__input::placeholder {
      color: #a996bd;
    }

    .doctor-location__input:focus,
    .doctor-location__input.is-valid {
      border-color: #8429ff;
      box-shadow: 0 0 0 4px rgba(125, 41, 222, 0.16);
    }

    .doctor-location__input.is-invalid {
      border-color: #d81837;
      box-shadow: 0 0 0 4px #eb000024;
    }

    .doctor-location__dropdown {
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

    .doctor-location__option {
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

    .doctor-location__option:last-child {
      border-bottom: 0;
    }

    .doctor-location__option:hover {
      background: #f0e6ff;
    }

    .doctor-location__option--status {
      justify-content: center;
      color: #6e38a6;
      cursor: default;
      pointer-events: none;
    }

    .doctor-location__zip {
      min-width: 3rem;
      color: #6e38a6;
    }

    .doctor-location__name {
      flex: 1;
      min-width: 0;
    }

    .doctor-location__canton {
      color: #8c49ff;
      font-size: 12px;
    }
  `],
})
export class DoctorInfoFormComponent {
  group = input.required<FormGroup<DoctorInfoControls>>();

  private readonly locationService = inject(LocationService);
  private readonly i18n = inject(TranslationService);
  private readonly locationSearchSubject = new Subject<string>();
  private locationBlurCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly stateVersion = signal(0);

  protected readonly locationQuery = signal('');
  protected readonly locationResults = signal<LocationFilterResponse[]>([]);
  protected readonly locationDropdownOpen = signal(false);
  protected readonly locationLoading = signal(false);

  protected readonly locationInvalid = computed(() => {
    this.stateVersion();
    const group = this.group();
    const postalCode = group.controls.postalCode;
    const city = group.controls.city;
    return (postalCode.invalid && postalCode.touched) || (city.invalid && city.touched);
  });

  protected readonly locationValid = computed(() => {
    this.stateVersion();
    const group = this.group();
    return group.controls.postalCode.valid && group.controls.city.valid && this.hasLocationValue(group);
  });

  protected readonly showLocationDropdown = computed(
    () =>
      this.locationDropdownOpen() &&
      this.canSearchLocations(this.locationQuery()) &&
      (this.locationLoading() || this.locationResults().length > 0),
  );

  constructor() {
    effect((onCleanup) => {
      const subscription = this.group().events.subscribe(() => {
        this.stateVersion.update((version) => version + 1);
        if (!this.locationDropdownOpen()) {
          this.syncLocationQueryFromGroup(this.group());
        }
      });
      this.syncLocationQueryFromGroup(this.group());
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
    const group = this.group();
    this.locationQuery.set(value);
    group.controls.postalCode.setValue(this.numericLocationPrefix(value));
    group.controls.city.setValue(null);
    group.controls.postalCode.markAsDirty();
    group.controls.city.markAsDirty();

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
    const group = this.group();
    group.controls.postalCode.markAsTouched();
    group.controls.city.markAsTouched();
    this.locationBlurCloseTimeoutId = setTimeout(() => {
      this.locationDropdownOpen.set(false);
      this.syncLocationQueryFromGroup(group);
    }, 140);
  }

  protected selectLocation(location: LocationFilterResponse, event?: Event): void {
    event?.preventDefault();
    this.cancelLocationBlurClose();
    const group = this.group();
    group.controls.postalCode.setValue(location.zipCode);
    group.controls.city.setValue(location.locationName);
    group.controls.postalCode.markAsDirty();
    group.controls.city.markAsDirty();
    group.controls.postalCode.markAsTouched();
    group.controls.city.markAsTouched();
    group.controls.postalCode.updateValueAndValidity();
    group.controls.city.updateValueAndValidity();
    this.locationQuery.set(this.locationDisplayValue(location));
    this.locationResults.set([]);
    this.locationDropdownOpen.set(false);
    this.locationLoading.set(false);
  }

  protected locationError(): string {
    const group = this.group();
    if (group.controls.postalCode.hasError('required') || group.controls.city.hasError('required')) {
      return this.i18n.translate('locationRequiredError');
    }
    if (group.controls.postalCode.hasError('postalCode')) {
      return this.i18n.translate('postalCodeDigitsError');
    }
    return this.i18n.translate('family.locationSelectError');
  }

  private syncLocationQueryFromGroup(group: FormGroup<DoctorInfoControls>): void {
    const zipCode = group.controls.postalCode.value?.trim() ?? '';
    const city = group.controls.city.value?.trim() ?? '';
    this.locationQuery.set([zipCode, city].filter(Boolean).join(' '));
  }

  private hasLocationValue(group: FormGroup<DoctorInfoControls>): boolean {
    return !!group.controls.postalCode.value?.trim() && !!group.controls.city.value?.trim();
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
  selector: 'app-medical-questions-section',
  standalone: true,
  imports: [
    BinaryQuestionCardComponent,
    DateInputComponent,
    DiagnosisQuestionCardComponent,
    DoctorInfoFormComponent,
    NumberInputComponent,
    QuestionCardShellComponent,
    TextAreaComponent,
    TranslatePipe,
    YesNoToggleComponent,
  ],
  templateUrl: './medical-questions-section.component.html',
  host: { class: 'contents' },
})
export class MedicalQuestionsSectionComponent {
  protected readonly declaration = inject(HealthDeclarationFormService);

  protected isYes(control: { value: { value: boolean } | null }): boolean {
    return control.value?.value === true;
  }
}
