import { Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ValidationErrorPipe } from '../../pipes/validation-error.pipe';
import { BaseFormControlComponent, ControlOptionPrimitive, OptionValue } from './base-form-control.component';

@Component({
  selector: 'app-option-toggle',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationErrorPipe],
  template: `
    <div class="min-w-0 max-w-full space-y-1" [attr.data-validation-anchor]="validationAnchor()">
      @if (label()) {
        <div class="block min-w-0 max-w-full whitespace-normal break-words text-[12px] font-light leading-[1.18] text-[#706876]">
          {{ label() }}
        </div>
      }
      <div
        class="option-toggle"
        [class.option-toggle--list]="variant() === 'list'"
        [class.option-toggle--has-selection]="variant() === 'list' && hasSelection()"
        [class.is-active]="activeBorder()"
        [class.is-invalid]="showError()"
        [style.grid-template-columns]="optionGridColumns()"
        role="group"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
      >
        @for (option of options(); track option.value) {
          <button
            type="button"
            class="option-button"
            [class.option-button--list]="variant() === 'list'"
            [class.is-selected]="isSelected(option)"
            [disabled]="disabled()"
            [attr.aria-pressed]="isSelected(option)"
            (click)="select(option)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      @if (showError()) {
        <p [id]="errorId()" class="text-[12px] font-normal text-[#d81837]">
          {{ errors() | validationError: label() }}
        </p>
      }
    </div>
  `,
  styleUrl: './form-control.css',
})
export class OptionToggleComponent extends BaseFormControlComponent<OptionValue | null> {
  options = input.required<readonly OptionValue[]>();
  variant = input<'grid' | 'list'>('grid');

  selectedValue = computed(() => this.value()?.value ?? null);
  hasSelection = computed(() => this.selectedValue() !== null && this.selectedValue() !== '');
  optionGridColumns = computed(() =>
    this.variant() === 'list' ? '1fr' : `repeat(${this.options().length}, minmax(0, 1fr))`,
  );

  select(option: OptionValue): void {
    const control = this.control();
    control.setValue(option);
    control.markAsDirty();
    control.markAsTouched();
    this.syncControlState(control);
    this.markAsTouched();
  }

  isSelected(option: OptionValue<ControlOptionPrimitive>): boolean {
    return this.selectedValue() === option.value;
  }
}

@Component({
  selector: 'app-yes-no-toggle',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="min-w-0 max-w-full space-y-1" [attr.data-validation-anchor]="validationAnchor()">
      @if (label()) {
        <div class="block min-w-0 max-w-full whitespace-normal break-words text-[12px] font-light leading-[1.18] text-[#706876]">
          {{ label() }}
        </div>
      }

      <div
        class="yes-no-toggle"
        [class.is-active]="activeBorder()"
        [class.is-invalid]="showError()"
        role="group"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
      >
        @for (option of options(); track option.value) {
          <button
            type="button"
            class="toggle-button"
            [class.is-selected]="isSelected(option)"
            [disabled]="disabled()"
            [attr.aria-pressed]="isSelected(option)"
            (click)="select(option)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      @if (showError()) {
        <p [id]="errorId()" class="text-[12px] font-normal text-[#d81837]">
          {{ yesNoErrorMessage() }}
        </p>
      }
    </div>
  `,
  styleUrl: './form-control.css',
})
export class YesNoToggleComponent extends BaseFormControlComponent<OptionValue<boolean> | null> {
  yesLabel = input('Ja');
  noLabel = input('Nein');

  options = computed<readonly OptionValue<boolean>[]>(() => [
    { value: false, label: this.noLabel() },
    { value: true, label: this.yesLabel() },
  ]);

  select(option: OptionValue<boolean>): void {
    const control = this.control();
    control.setValue(option);
    control.markAsDirty();
    control.markAsTouched();
    this.syncControlState(control);
    this.markAsTouched();
  }

  isSelected(option: OptionValue<boolean>): boolean {
    return this.value()?.value === option.value;
  }

  yesNoErrorMessage(): string {
    return this.errors()?.['required'] ? 'Pick one.' : '';
  }
}
