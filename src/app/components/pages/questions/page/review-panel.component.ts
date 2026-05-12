import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import type { ReviewPersonScope } from '../../../../services/health-declaration-report.types';
import type { HealthDeclarationReportPayload } from '../../../../services/health-declaration-report.service';
import { HealthDeclarationReportService } from '../../../../services/health-declaration-report.service';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { ValidationErrorPipe } from '../../../../pipes/validation-error.pipe';

@Component({
  selector: 'app-review-panel',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, ValidationErrorPipe],
  template: `
    <section class="review-panel" aria-labelledby="review-title">
      @if (submittedReport(); as report) {
        <div class="review-success">
          <div class="review-panel__check" aria-hidden="true">&#10003;</div>
          <h2 id="review-title">{{ 'review.successTitle' | t }}</h2>
          <p>{{ 'review.successText' | t: { email: report.recipientEmail } }}</p>
          <button
            class="review-button review-button--primary"
            type="button"
            (click)="completed.emit()"
          >
            {{ 'review.backToStart' | t }}
          </button>
        </div>
      } @else {
        <div class="review-panel__top">
          <div class="review-panel__copy">
            <div class="review-panel__check" aria-hidden="true">&#10003;</div>
            <div>
              <h2 id="review-title">{{ 'review.completeTitle' | t }}</h2>
              <p>{{ 'review.completeText' | t }}</p>
            </div>
          </div>
        </div>

        <div class="review-controls" aria-label="Review email controls">
          <label class="review-field">
            <span>{{ 'review.emailLabel' | t }}</span>
            <input
              type="email"
              [formControl]="recipientEmail"
              [placeholder]="'review.emailPlaceholder' | t"
              [attr.aria-invalid]="recipientEmail.invalid && recipientEmail.touched"
              [disabled]="sending()"
            />
            @if (recipientEmail.invalid && recipientEmail.touched) {
              <p class="field-error">
                {{ recipientEmail.errors | validationError: ('review.emailLabel' | t) }}
              </p>
            }
          </label>

          @if (showScopeSelector()) {
            <label class="review-field">
              <span>{{ 'review.scopeLabel' | t }}</span>
              <select
                [value]="selectedScope()"
                [disabled]="sending()"
                (change)="selectScope($event)"
              >
                <option value="all">{{ 'review.allPeople' | t }}</option>
                @for (person of personOptions(); track person.id) {
                  <option [value]="person.id">{{ person.label }}</option>
                }
              </select>
            </label>
          }

          <button
            class="review-button review-button--primary"
            type="button"
            [disabled]="sending()"
            (click)="sendReport()"
          >
            {{ sending() ? ('review.sending' | t) : ('review.prepareEmail' | t) }}
          </button>
        </div>

        @if (errorMessage()) {
          <p class="field-error review-submit-error">{{ errorMessage() }}</p>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .review-panel {
        display: grid;
        gap: 1rem;
        min-width: 0;
        margin: 1.25rem 0 40px;
        padding: 1.15rem;
        border-radius: 1.75rem;
        background: var(--panel-bg);
        color: #1d1426;
      }

      .review-panel__top,
      .review-controls,
      .review-success {
        display: grid;
        gap: 0.75rem;
        min-width: 0;
      }

      .review-panel__copy {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        min-width: 0;
      }

      .review-success {
        justify-items: center;
        padding: 1rem 0.25rem;
        text-align: center;
      }

      .review-panel__check {
        display: grid;
        flex: 0 0 auto;
        width: 2.4rem;
        height: 2.4rem;
        place-items: center;
        border-radius: 999px;
        background: #8425e5;
        color: #ffffff;
        font-size: 0.95rem;
      }

      .review-panel h2 {
        margin: 0;
        color: #1d1426;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.25;
      }

      .review-panel p {
        margin: 0.25rem 0 0;
        color: #706876;
        font-size: 12px;
        line-height: 1.45;
      }

      .review-panel p.field-error {
        color: #d81837;
      }

      .review-controls {
        grid-template-columns: 1fr;
        align-items: stretch;
      }

      .review-field {
        display: grid;
        gap: 0.35rem;
        min-width: 0;
      }

      .review-field span {
        color: #706876;
        font-size: 12px;
        line-height: 1.2;
      }

      .review-field input,
      .review-field select {
        width: 100%;
        min-width: 0;
        min-height: var(--control-height);
        padding: 0 0.8rem;
        border: 1px solid var(--control-border, #cabadc);
        border-radius: var(--radius-control, 11px);
        background: var(--control-bg, #e6d9f4);
        color: #050307;
        font-size: 14px;
        outline: none;
      }

      .review-field input:disabled,
      .review-field select:disabled,
      .review-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .review-field input:focus,
      .review-field select:focus {
        border-color: #8429ff;
        box-shadow: 0 0 0 3px rgba(125, 41, 222, 0.16);
      }

      .review-field input[aria-invalid='true'] {
        border-color: var(--error, #d81837);
        box-shadow: 0 0 0 3px rgba(235, 0, 0, 0.14);
      }

      .review-submit-error {
        padding-left: 0.5rem;
      }

      .review-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 0;
        min-height: var(--control-height);
        padding: 0 1.25rem;
        border: 1px solid rgba(125, 41, 222, 0.22);
        border-radius: 0.9rem;
        background: #ffffff;
        color: #1d1426;
        cursor: pointer;
        font: inherit;
        font-size: 14px;
        font-weight: 400;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          opacity 150ms ease;
      }

      .review-button--primary {
        border-color: transparent;
        background: #8425e5;
        color: #ffffff;
        box-shadow: 0 16px 28px rgba(111, 39, 222, 0.18);
      }

      .review-button:hover:not(:disabled) {
        box-shadow: 0 16px 26px rgba(70, 24, 128, 0.14);
      }

      @media (max-width: 680px) {
        .review-panel {
          padding: 1rem;
          border-radius: 1.35rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPanelComponent {
  readonly completed = output<void>();

  protected readonly recipientEmail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly selectedScope = signal<ReviewPersonScope>('all');
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submittedReport = signal<HealthDeclarationReportPayload | null>(null);

  private readonly declaration = inject(HealthDeclarationFormService);
  private readonly reportService = inject(HealthDeclarationReportService);
  private readonly i18n = inject(TranslationService);

  protected readonly personOptions = computed(() => {
    this.declaration.peopleVersion();
    return this.declaration.peopleArray.controls.map((person, index) => ({
      id: this.declaration.personId(person),
      label: `Person ${index + 1}`,
    }));
  });
  protected readonly showScopeSelector = computed(() => this.personOptions().length > 1);

  protected selectScope(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedScope.set(value === 'all' ? 'all' : value);
    this.errorMessage.set('');
  }

  protected async sendReport(): Promise<void> {
    this.recipientEmail.markAsTouched();
    if (this.recipientEmail.invalid || this.sending()) {
      return;
    }
    const scope = this.showScopeSelector() ? this.selectedScope() : 'all';

    this.sending.set(true);
    this.errorMessage.set('');

    try {
      const report = await this.reportService.sendReportEmail(
        this.recipientEmail.value.trim(),
        scope,
      );
      this.declaration.submitDeclaration();
      this.submittedReport.set(report);
    } catch (error) {
      this.errorMessage.set(this.errorText(error));
    } finally {
      this.sending.set(false);
    }
  }

  private errorText(error: unknown): string {
    if (!(error instanceof Error)) {
      return this.i18n.translate('review.emailSendFailed');
    }

    if (error.message.includes('GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL')) {
      return this.i18n.translate('review.emailServiceNotConfigured');
    }

    if (error.message.includes('Report was not stored by Google Apps Script')) {
      return 'Google Apps Script received the request, but the report was not found in the spreadsheet. Run setup(), confirm REPORT_SPREADSHEET_ID, and check the Errors sheet.';
    }

    return this.i18n.translate('review.emailSendFailed');
  }
}
