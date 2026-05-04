import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';

import { DateInputComponent, OptionToggleComponent, TextAreaComponent, TextInputComponent, YesNoToggleComponent } from '../../../form-controls';
import { LocationService } from '../../../../services/location.service';
import { QuestionnaireFormService } from '../questionnaire-form.service';
import { DiagnosisEntryGroup, DiagnosisQuestionId } from '../questionnaire.types';

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
  templateUrl: './diagnosis-entry.component.html',
  host: { class: 'block min-w-0 max-w-full overflow-hidden' },
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

  implantYes = computed(() => {
    this.stateVersion();
    return this.entry().controls.implantAnswer.value?.value === true;
  });

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
      });
      onCleanup(() => subscription.unsubscribe());
    });

    effect((onCleanup) => {
      const entry = this.entry();
      const postalCode = entry.controls.doctorPostalCode;
      const city = entry.controls.doctorCity;
      const subscription = postalCode.valueChanges
        .pipe(
          startWith(postalCode.value),
          map((value) => value?.trim() ?? ''),
          debounceTime(250),
          distinctUntilChanged(),
          filter((value) => /^\d{4,6}$/.test(value)),
          switchMap((value) =>
            this.locationService.searchLocations(value).pipe(
              map((locations) => locations.find((location) => location.zipCode === value) ?? locations[0] ?? null),
            ),
          ),
        )
        .subscribe((location) => {
          if (!location || city.value === location.locationName) {
            return;
          }

          city.setValue(location.locationName);
          city.markAsDirty();
          city.updateValueAndValidity();
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }
}

@Component({
  selector: 'app-diagnosis-panel',
  standalone: true,
  imports: [DiagnosisEntryComponent],
  templateUrl: './diagnosis-panel.component.html',
  host: { class: 'block' },
})
export class DiagnosisPanelComponent {
  formService = input.required<QuestionnaireFormService>();
  questionId = input.required<DiagnosisQuestionId>();
  disabled = input(false);

  private stateVersion = signal(0);

  entries = computed(() => {
    this.stateVersion();
    return this.formService().diagnosesFor(this.questionId());
  });

  minDiagnosisError = computed(() => {
    this.stateVersion();
    const errors = this.formService().form.controls.diagnoses.errors ?? {};
    return Object.prototype.hasOwnProperty.call(errors, `minDiagnosis_${this.questionId()}`);
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
    this.formService().addDiagnosis(this.questionId());
    this.stateVersion.update((version) => version + 1);
  }

  removeEntry(entry: DiagnosisEntryGroup): void {
    this.formService().removeDiagnosis(entry);
    this.stateVersion.update((version) => version + 1);
  }
}
