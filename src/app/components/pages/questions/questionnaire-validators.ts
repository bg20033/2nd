import { AbstractControl, FormArray, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { OptionValue } from '../../form-controls';
import { ValidationErrorKey } from '../../../constants/app-enums';
import { DiagnosisEntryGroup, DiagnosisQuestionId } from './questionnaire.types';

export const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function fullDateValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;

  if (!value) {
    return null;
  }

  return DATE_PATTERN.test(value) ? null : { [ValidationErrorKey.FullDate]: true };
}

export function dateOrderValidator(fromKey = 'from', toKey = 'to'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const from = control.get(fromKey)?.value;
    const to = control.get(toKey)?.value;

    if (!from || !to || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return null;
    }

    return to >= from ? null : { [ValidationErrorKey.DateOrder]: true };
  };
}

export function postalCodeValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;
  return !value || /^\d{4,6}$/.test(value) ? null : { [ValidationErrorKey.PostalCode]: true };
}

export function streetNumberValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;
  return !value || /^\d+$/.test(value) ? null : { [ValidationErrorKey.StreetNumber]: true };
}

export function minDiagnosisEntriesValidator(
  questionId: DiagnosisQuestionId,
  answerControl: FormControl<OptionValue<boolean> | null>,
  min = 1,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const entries = control as FormArray<DiagnosisEntryGroup>;
    const answerIsYes = answerControl.value?.value === true;

    if (!answerIsYes) {
      return null;
    }

    const count = entries.controls.filter((entry) => entry.controls.questionId.value === questionId).length;
    return count >= min ? null : { [`minDiagnosis_${questionId}`]: { min, actual: count, questionId } };
  };
}
