import { Component, inject } from '@angular/core';

import {
  DateInputComponent,
  NumberInputComponent,
  TextAreaComponent,
  YesNoToggleComponent,
} from '../../../form-controls';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { BinaryQuestionCardComponent, DiagnosisQuestionCardComponent, QuestionCardShellComponent } from '../cards/question-card-shell.component';
import { DoctorInfoFormComponent } from './doctor-info-form.component';

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
