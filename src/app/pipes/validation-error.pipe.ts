import { InjectionToken, Pipe, PipeTransform, inject } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { ValidationErrorKey } from '../constants/app-enums';
import { TranslationService } from '../services/translation.service';

export type ValidationErrorMessageContext = {
  key: string;
  error: unknown;
  errors: ValidationErrors;
  label: string;
};

export type ValidationErrorMessageFactory = (context: ValidationErrorMessageContext) => string;
export type ValidationErrorMessage = string | ValidationErrorMessageFactory;
export type ValidationErrorMessages = Record<string, ValidationErrorMessage>;

export const DEFAULT_VALIDATION_ERROR_MESSAGES: ValidationErrorMessages = {};

export const VALIDATION_ERROR_MESSAGES = new InjectionToken<ValidationErrorMessages[]>(
  'VALIDATION_ERROR_MESSAGES',
);

@Pipe({
  name: 'validationError',
  standalone: true,
  pure: false,
})
export class ValidationErrorPipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);
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

    this.i18n.language();

    const resolvedLabel = label || this.i18n.translate('thisFieldLabel');
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

    return this.defaultMessage(key, error, resolvedLabel);
  }

  private defaultMessage(key: string, error: unknown, label: string): string {
    switch (key) {
      case ValidationErrorKey.Required:
        return this.validationText('validationRequired', label);
      case ValidationErrorKey.MinLength:
        return this.validationText('validationMinLength', label, getErrorValue(error, 'requiredLength'));
      case ValidationErrorKey.MaxLength:
        return this.validationText('validationMaxLength', label, getErrorValue(error, 'requiredLength'));
      case ValidationErrorKey.Min:
        return this.validationText('validationMin', label, getErrorValue(error, 'min'));
      case ValidationErrorKey.Max:
        return this.validationText('validationMax', label, getErrorValue(error, 'max'));
      case ValidationErrorKey.Email:
        return this.validationText('validationEmail', label);
      case ValidationErrorKey.Pattern:
        return this.validationText('validationPattern', label);
      case ValidationErrorKey.FullDate:
        return this.validationText('validationFullDate', label);
      case ValidationErrorKey.DateOrder:
        return this.i18n.translate('validationDateOrder');
      case ValidationErrorKey.PostalCode:
        return this.validationText('validationPostalCode', label);
      case ValidationErrorKey.StreetNumber:
        return this.validationText('validationStreetNumber', label);
      default:
        return this.validationText('validationInvalid', label);
    }
  }

  private validationText(key: string, label: string, secondary?: unknown): string {
    return this.i18n
      .translate(key, { label, value: secondary == null ? '' : String(secondary) })
      .replaceAll('{$INTERPOLATION}', label)
      .replaceAll('{$INTERPOLATION_1}', secondary == null ? '' : String(secondary));
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
