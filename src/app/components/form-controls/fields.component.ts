import { Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ValidationErrorPipe } from '../../pipes';
import { BaseFormControlComponent } from './base-form-control.component';

const NATIVE_INPUT_TEMPLATE = `
  <div class="min-w-0 max-w-full space-y-1.5" [attr.data-validation-anchor]="validationAnchor()">
    @if (label()) {
      <label [for]="controlId()" class="block min-w-0 max-w-full whitespace-normal wrap-break-wordword text-[16px] font-normal leading-[1.18] text-[#706876]">
        {{ label() }}
      </label>
    }

    <input
      [id]="controlId()"
      [type]="nativeType"
      [formControl]="control()"
      [placeholder]="placeholder()"
      [min]="min()"
      [max]="max()"
      [class]="inputClasses()"
      [attr.aria-invalid]="showError()"
      [attr.aria-describedby]="describedBy()"
      (blur)="markAsTouched()"
    />

    @if (showError()) {
      <p [id]="errorId()" class="text-xs font-semibold text-[#d81837]">
        {{ errors() | validationError: label() }}
      </p>
    }
  </div>
`;

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: NATIVE_INPUT_TEMPLATE,
})
export class TextInputComponent extends BaseFormControlComponent<string | null> {
  protected readonly nativeType = 'text';
}

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: NATIVE_INPUT_TEMPLATE,
})
export class DateInputComponent extends BaseFormControlComponent<string | null> {
  protected readonly nativeType = 'date';
}

@Component({
  selector: 'app-month-input',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: NATIVE_INPUT_TEMPLATE,
})
export class MonthInputComponent extends BaseFormControlComponent<string | null> {
  protected readonly nativeType = 'month';
}

@Component({
  selector: 'app-number-input',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: `
    <div class="min-w-0 max-w-full space-y-1.5" [attr.data-validation-anchor]="validationAnchor()">
      @if (label()) {
        <label [for]="controlId()" class="block min-w-0 max-w-full whitespace-normal wrap-break-word text-[16px] font-normal leading-[1.18] text-[#706876]">
          {{ label() }}
        </label>
      }

      <input
        [id]="controlId()"
        type="text"
        inputmode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        [value]="displayValue()"
        [placeholder]="placeholder()"
        [min]="min()"
        [max]="max()"
        [class]="inputClasses()"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
        (input)="handleInput($event)"
        (blur)="markAsTouched()"
      />

      @if (showError()) {
        <p [id]="errorId()" class="text-xs font-semibold text-[#d81837]">
          {{ errors() | validationError: label() }}
        </p>
      }
    </div>
  `,
})
export class NumberInputComponent extends BaseFormControlComponent<number | null> {
  displayValue(): string {
    const value = this.control().value;
    return value === null || value === undefined ? '' : String(value);
  }

  handleInput(event: Event): void {
    const control = this.control();
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.trim().replace(',', '.');
    const nextValue = rawValue === '' ? null : Number(rawValue);

    if (rawValue !== '' && !Number.isFinite(nextValue)) {
      control.setValue(null);
      control.markAsDirty();
      this.syncControlState(control);
      return;
    }

    control.setValue(nextValue);
    control.markAsDirty();
    this.syncControlState(control);
  }
}

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: `
    <div class="min-w-0 max-w-full space-y-1.5" [attr.data-validation-anchor]="validationAnchor()">
      @if (label()) {
        <label [for]="controlId()" class="block min-w-0 max-w-full whitespace-normal wrap-break-word text-[16px] font-normal leading-[1.4]! text-[#706876]">
          {{ label() }}
        </label>
      }

      <textarea
        #textarea
        [id]="controlId()"
        [formControl]="control()"
        [placeholder]="placeholder()"
        [rows]="rows()"
        [class]="textareaClasses()"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
        (input)="resize()"
        (blur)="markAsTouched()"
      ></textarea>

      @if (showError()) {
        <p [id]="errorId()" class="text-xs font-semibold text-[#d81837]">
          {{ errors() | validationError: label() }}
        </p>
      }
    </div>
  `,
})
export class TextAreaComponent extends BaseFormControlComponent<string | null> {
  rows = input(1);
  autoResize = input(true);

  private textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  textareaClasses = computed(() => `${this.inputClasses()} resize-none overflow-hidden leading-[1.2]! p-[10px]!`);

  constructor() {
    super();

    effect(() => {
      this.value();
      this.autoResize();
      this.resize();
    });
  }

  resize(): void {
    if (!this.autoResize()) {
      return;
    }

    const textarea = this.textarea()?.nativeElement;
    if (!textarea) {
      return;
    }

    textarea.style.height = '40px';
    textarea.style.height = `${Math.max(40, textarea.scrollHeight)}px`;
  }
}

@Component({
  selector: 'app-checkbox-input',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: `
    <div class="min-w-0 max-w-full space-y-1.5" [attr.data-validation-anchor]="validationAnchor()">
      <label class="checkbox-field">
        <input
          type="checkbox"
          [formControl]="control()"
          [attr.aria-invalid]="showError()"
          [attr.aria-describedby]="describedBy()"
          (blur)="markAsTouched()"
        />
        <span>
          {{ label() }}
        </span>
      </label>

      @if (showError()) {
        <p [id]="errorId()" class="text-xs font-semibold text-[#d81837]">
          {{ errors() | validationError: label() }}
        </p>
      }
    </div>
  `,
  styleUrl: './form-control.css',
})
export class CheckboxInputComponent extends BaseFormControlComponent<boolean> {}
