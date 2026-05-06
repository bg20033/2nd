import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl } from '@angular/forms';

import {
  CheckboxInputComponent,
  DateInputComponent,
  OptionToggleComponent,
  TextAreaComponent,
  TextInputComponent,
  YesNoToggleComponent,
} from '../../../form-controls';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { BinaryQuestionCardComponent, QuestionCardShellComponent } from '../cards/question-card-shell.component';
import { StringControl } from '../questionnaire.types';
import { DATE_PATTERN } from '../questionnaire-validators';

@Component({
  selector: 'app-dental-questions-section',
  standalone: true,
  imports: [
    BinaryQuestionCardComponent,
    CheckboxInputComponent,
    DateInputComponent,
    NgTemplateOutlet,
    OptionToggleComponent,
    QuestionCardShellComponent,
    TextAreaComponent,
    TextInputComponent,
    TranslatePipe,
    YesNoToggleComponent,
  ],
  templateUrl: './dental-questions-section.component.html',
  host: { class: 'contents' },
})
export class DentalQuestionsSectionComponent {
  protected readonly declaration = inject(HealthDeclarationFormService);
  protected readonly dentalChartLabels = [8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8] as const;
  protected readonly upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  protected readonly lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  protected isYes(control: { value: { value: boolean } | null }): boolean {
    return control.value?.value === true;
  }

  protected hasTooth(control: FormControl<number[]>, tooth: number): boolean {
    return control.value.includes(tooth);
  }

  protected toothCellClass(control: FormControl<number[]>, tooth: number): string {
    const base =
      'dental-finding__cell relative min-h-[1.85rem] cursor-pointer border-0 border-r border-[rgba(178,140,229,0.38)] bg-transparent text-[12px] font-normal leading-none text-[#8a7b9c] transition';
    return this.hasTooth(control, tooth) ? `${base} selected` : base;
  }

  protected toggleTooth(control: FormControl<number[]>, tooth: number): void {
    const next = control.value.includes(tooth)
      ? control.value.filter((value) => value !== tooth)
      : [...control.value, tooth].sort((a, b) => a - b);
    control.setValue(next);
    control.markAsDirty();
  }

  protected dateOrderError(from: StringControl, to: StringControl): boolean {
    const fromValue = from.value;
    const toValue = to.value;

    if (!fromValue || !toValue || !DATE_PATTERN.test(fromValue) || !DATE_PATTERN.test(toValue)) {
      return false;
    }

    return toValue < fromValue && (from.touched || to.touched || from.dirty || to.dirty);
  }
}
