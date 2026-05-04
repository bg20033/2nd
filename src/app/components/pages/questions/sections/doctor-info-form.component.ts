import { Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { TextInputComponent } from '../../../form-controls';
import { DoctorInfoControls } from '../questionnaire.types';

@Component({
  selector: 'app-doctor-info-form',
  standalone: true,
  imports: [TextInputComponent],
  templateUrl: './doctor-info-form.component.html',
})
export class DoctorInfoFormComponent {
  group = input.required<FormGroup<DoctorInfoControls>>();
}
