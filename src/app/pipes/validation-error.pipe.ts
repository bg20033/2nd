import { InjectionToken, Pipe, PipeTransform, inject } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { ValidationErrorKey } from '../constants/app-enums';

export type ValidationErrorMessageContext = {
  key: string;
  error: unknown;
  errors: ValidationErrors;
  label: string;
};

export type ValidationErrorMessageFactory = (context: ValidationErrorMessageContext) => string;
export type ValidationErrorMessage = string | ValidationErrorMessageFactory;
export type ValidationErrorMessages = Record<string, ValidationErrorMessage>;

export const DEFAULT_VALIDATION_ERROR_MESSAGES: ValidationErrorMessages = {
  [ValidationErrorKey.Required]: ({ label }) => `${label} is required.`,
  [ValidationErrorKey.MinLength]: ({ label, error }) =>
    `${label} must be at least ${getErrorValue(error, 'requiredLength')} characters.`,
  [ValidationErrorKey.MaxLength]: ({ label, error }) =>
    `${label} must be at most ${getErrorValue(error, 'requiredLength')} characters.`,
  [ValidationErrorKey.Min]: ({ label, error }) => `${label} must be at least ${getErrorValue(error, 'min')}.`,
  [ValidationErrorKey.Max]: ({ label, error }) => `${label} must be at most ${getErrorValue(error, 'max')}.`,
  [ValidationErrorKey.Email]: ({ label }) => `${label} must be a valid email address.`,
  [ValidationErrorKey.Pattern]: ({ label }) => `${label} has an invalid format.`,
  [ValidationErrorKey.FullDate]: ({ label }) => `${label} must be a valid date.`,
  [ValidationErrorKey.DateOrder]: () => 'End date must be after start date.',
  [ValidationErrorKey.PostalCode]: ({ label }) => `${label} must be 4 to 6 digits.`,
  [ValidationErrorKey.StreetNumber]: ({ label }) => `${label} must be a valid street number.`,
};

export const VALIDATION_ERROR_MESSAGES = new InjectionToken<ValidationErrorMessages[]>(
  'VALIDATION_ERROR_MESSAGES',
);

@Pipe({
  name: 'validationError',
  standalone: true,
})
export class ValidationErrorPipe implements PipeTransform {
  private readonly customMessages = inject<ValidationErrorMessages[]>(VALIDATION_ERROR_MESSAGES, {
    optional: true,
  });

  transform(
    errors: ValidationErrors | null | undefined,
    label = 'This field',
    messages: ValidationErrorMessages = {},
  ): string {
    if (!errors) {
      return '';
    }

    const [key, error] = Object.entries(errors)[0] ?? [];
    if (!key) {
      return '';
    }

    const resolvedLabel = label || 'This field';
    const allMessages = {
      ...DEFAULT_VALIDATION_ERROR_MESSAGES,
      ...(this.customMessages ?? []).reduce(
        (merged, custom) => ({ ...merged, ...custom }),
        {} as ValidationErrorMessages,
      ),
      ...messages,
    };
    const message = allMessages[key];

    if (typeof message === 'function') {
      return message({ key, error, errors, label: resolvedLabel });
    }

    if (typeof message === 'string') {
      return interpolateMessage(message, { key, error, errors, label: resolvedLabel });
    }

    return `${resolvedLabel} is invalid.`;
  }
}

function interpolateMessage(message: string, context: ValidationErrorMessageContext): string {
  return message.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = getPathValue(context, path);
    return value == null ? '' : String(value);
  });
}

function getPathValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => getErrorValue(value, key), source);
}

function getErrorValue(source: unknown, key: string): unknown {
  if (source && typeof source === 'object' && key in source) {
    return (source as Record<string, unknown>)[key];
  }

  return undefined;
}
