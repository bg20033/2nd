import { Directive, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ValidationErrors, Validators } from '@angular/forms';

import { TranslationService } from '../../services/translation.service';

let nextControlId = 0;

export type ControlOptionPrimitive = string | boolean;

export interface OptionValue<T extends ControlOptionPrimitive = ControlOptionPrimitive> {
  value: T;
  label: string;
}

@Directive({
  standalone: true,
})
export abstract class BaseFormControlComponent<T> {
  control = input.required<FormControl<T>>();
  label = input('');
  placeholder = input('');
  id = input('');
  min = input<string | number | null>(null);
  max = input<string | number | null>(null);
  digitsOnly = input(false);

  value = signal<T | null>(null);
  errors = signal<ValidationErrors | null>(null);
  touched = signal(false);
  dirty = signal(false);
  invalid = signal(false);
  disabled = signal(false);

  private readonly i18n = inject(TranslationService);
  private readonly fallbackId = `form-control-${++nextControlId}`;
  private readonly stateVersion = signal(0);

  controlId = computed(() => this.id() || this.fallbackId);
  errorId = computed(() => `${this.controlId()}-error`);
  required = computed(() => {
    this.stateVersion();
    return this.control().hasValidator(Validators.required);
  });
  showError = computed(() => this.touched() && this.invalid());
  describedBy = computed(() => (this.showError() ? this.errorId() : null));
  activeBorder = computed(() => this.touched() && this.hasValue(this.value()));
  validationAnchor = computed(() => (this.showError() ? '' : null));
  inputMode = computed(() => (this.digitsOnly() ? 'numeric' : null));
  inputPattern = computed(() => (this.digitsOnly() ? '[0-9]*' : null));
  displayPlaceholder = computed(() => {
    this.i18n.language();
    return this.placeholder() || this.i18n.translate('common.placeholder.enterHere');
  });

  inputClasses = computed(() => {
    const base =
      'block h-[var(--control-height)] min-h-[var(--control-height)] w-full min-w-0 max-w-full rounded-[11px] border bg-[#e6d9f4] px-3 py-0 text-[14px] font-normal text-[#08050c] outline-none transition ' +
      'placeholder:text-[#a996bd] disabled:cursor-not-allowed disabled:bg-[#dfd1ee] disabled:text-[#a893bd]';
    let state = 'border-[#cabadc] focus:border-[#cabadc] focus:ring-4 focus:ring-[#7d29de14]';

    if (this.activeBorder()) {
      state = 'border-[#8429ff] focus:border-[#8429ff] focus:ring-4 focus:ring-[#7d29de29]';
    }

    if (this.showError()) {
      state = 'border-[#d81837] focus:border-[#d81837] focus:ring-4 focus:ring-[#eb000024]';
    }

    return `${base} ${state}`;
  });

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      this.syncControlState(control);

      const subscription = control.events.subscribe(() => {
        this.syncControlState(control);
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  markAsTouched(): void {
    const control = this.control();
    control.markAsTouched();
    this.syncControlState(control);
  }

  filterDigits(event: Event): void {
    if (!this.digitsOnly()) {
      return;
    }

    const inputElement = event.target as HTMLInputElement;
    const digits = inputElement.value.replace(/\D/g, '');
    if (inputElement.value !== digits) {
      inputElement.value = digits;
    }

    const control = this.control() as FormControl<string | null>;
    control.setValue(digits || null);
    control.markAsDirty();
    this.syncControlState(this.control());
  }

  protected syncControlState(control: FormControl<T>): void {
    const nextValue = control.value as T | null;

    this.value.set(nextValue);
    this.errors.set(control.errors);
    this.touched.set(control.touched);
    this.dirty.set(control.dirty);
    this.invalid.set(control.invalid);
    this.disabled.set(control.disabled);
    this.stateVersion.update((version) => version + 1);

  }

  private hasValue(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === 'object' && 'value' in value) {
      const optionValue = (value as { value: unknown }).value;
      return optionValue !== null && optionValue !== undefined && optionValue !== '';
    }

    return value !== null && value !== undefined;
  }
}
