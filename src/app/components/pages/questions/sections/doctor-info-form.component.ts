import { Component, effect, inject, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';

import { TextInputComponent } from '../../../form-controls';
import { LocationService } from '../../../../services/location.service';
import { DoctorInfoControls } from '../questionnaire.types';

@Component({
  selector: 'app-doctor-info-form',
  standalone: true,
  imports: [TextInputComponent],
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
