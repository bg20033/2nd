import { Component, effect, inject, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';

import {
  DateInputComponent,
  NumberInputComponent,
  TextAreaComponent,
  TextInputComponent,
  YesNoToggleComponent,
} from '../../../form-controls';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { LocationService } from '../../../../services/location.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { BinaryQuestionCardComponent, DiagnosisQuestionCardComponent, QuestionCardShellComponent } from '../cards/question-card-shell.component';
import { DoctorInfoControls } from '../questionnaire.types';

@Component({
  selector: 'app-doctor-info-form',
  standalone: true,
  imports: [TextInputComponent, TranslatePipe],
  templateUrl: './doctor-info-form.component.html',
})
export class DoctorInfoFormComponent {
  group = input.required<FormGroup<DoctorInfoControls>>();

  private readonly locationService = inject(LocationService);

  constructor() {
    effect((onCleanup) => {
      const group = this.group();
      const postalCode = group.controls.postalCode;
      const city = group.controls.city;
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
