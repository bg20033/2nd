import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  output,
  signal,
} from '@angular/core';

import { Footer } from '../../../footer/footer';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { DentalQuestionsSectionComponent } from '../sections/dental-questions-section.component';
import { MedicalQuestionsSectionComponent } from '../sections/medical-questions-section.component';
import { QuestionnaireTopbarComponent } from './questionnaire-topbar.component';

@Component({
  selector: 'app-review-panel',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="review-card">
      <div class="review-card__icon" aria-hidden="true">✓</div>
      <div class="review-card__copy">
        <h2>{{ 'review.completeTitle' | t }}</h2>
        <p>{{ 'review.completeText' | t }}</p>
      </div>
      <button class="review-card__button" type="button" (click)="completed.emit()">
        {{ 'review.backToStart' | t }}
      </button>
    </section>
  `,
  styles: [`
    .review-card {
      display: grid;
      justify-items: center;
      gap: 1rem;
      padding: 2rem 1.25rem;
      border: 1px solid rgba(202, 186, 220, 0.75);
      border-radius: 1.35rem;
      background:
        radial-gradient(circle at 50% 0%, rgba(132, 41, 255, 0.12), transparent 42%),
        rgba(255, 255, 255, 0.34);
      text-align: center;
    }

    .review-card__icon {
      display: grid;
      width: 3.25rem;
      height: 3.25rem;
      place-items: center;
      border: 1px solid rgba(132, 41, 255, 0.18);
      border-radius: 999px;
      background: linear-gradient(180deg, #8f2ef6, #6e27de);
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 400;
      box-shadow: 0 14px 32px rgba(111, 39, 222, 0.22);
    }

    .review-card__copy {
      display: grid;
      gap: 0.45rem;
      max-width: 24rem;
    }

    .review-card h2 {
      margin: 0;
      color: #1d1426;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .review-card p {
      margin: 0;
      color: #6f657a;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.45;
    }

    .review-card__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 10rem;
      min-height: var(--control-height);
      padding: 0 1.25rem;
      border: 1px solid transparent;
      border-radius: 0.9rem;
      background: linear-gradient(90deg, #6e27de, #8f2ef6);
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      font-weight: 400;
      box-shadow: 0 16px 28px rgba(111, 39, 222, 0.18);
      transition:
        background-color 150ms ease,
        box-shadow 150ms ease,
        opacity 150ms ease;
    }

    .review-card__button:hover {
      box-shadow: 0 18px 32px rgba(111, 39, 222, 0.24);
    }
  `],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPanelComponent {
  completed = output<void>();
}

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [
    DentalQuestionsSectionComponent,
    Footer,
    MedicalQuestionsSectionComponent,
    QuestionnaireTopbarComponent,
    ReviewPanelComponent,
    TranslatePipe,
  ],
  templateUrl: './questionnaire-form.component.html',
  host: { class: 'block' },
})
export class QuestionnaireFormComponent {
  readonly back = output<void>();
  readonly completed = output<void>();

  protected readonly validationAttempted = signal(false);
  protected readonly nextClickLocked = signal(false);

  protected readonly declaration: HealthDeclarationFormService;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly i18n = inject(TranslationService);

  constructor(declaration: HealthDeclarationFormService) {
    this.declaration = declaration;
    this.declaration.ensureQuestionnaireFor(this.declaration.currentPersonIndex());
  }

  footerNextLabel(): string {
    return this.declaration.currentPersonIndex() < this.declaration.peopleArray.length - 1
      ? this.i18n.translate('footer.nextPerson')
      : this.i18n.translate('common.next');
  }

  submit(): void {
    if (this.nextClickLocked()) {
      return;
    }

    this.nextClickLocked.set(true);
    const result = this.declaration.finalizeCurrentPerson();

    if (result === 'invalid') {
      this.validationAttempted.set(true);
      this.cdr.detectChanges();
      this.scheduleAfterValidationRender(() => {
        this.scrollToFirstInvalidField();
        this.nextClickLocked.set(false);
      });
      return;
    }

    this.validationAttempted.set(false);
    if (result === 'review') {
      this.nextClickLocked.set(false);
      this.scheduleFrame(() => this.scrollToTop());
      return;
    }

    this.scheduleFrame(() => {
      this.scrollToTop();
      this.nextClickLocked.set(false);
    });
  }

  goBack(): void {
    const currentIndex = this.declaration.currentPersonIndex();
    if (currentIndex > 0) {
      this.declaration.visitPerson(currentIndex - 1);
      this.validationAttempted.set(false);
      this.scheduleFrame(() => this.scrollToTop());
      return;
    }

    this.back.emit();
  }

  completeReview(): void {
    if (this.declaration.submitDeclaration()) {
      this.declaration.startNewDeclaration();
      this.completed.emit();
    }
  }

  private scrollToFirstInvalidField(): void {
    const scope = this.validationScope();
    const invalid = this.invalidCandidates(scope)[0];

    if (!invalid) {
      this.scrollToTop();
      return;
    }

    const target = this.validationScrollTarget(invalid);
    this.scrollToElement(target);
    this.focusInvalidControl(invalid, target);
  }

  private validationScope(): HTMLElement {
    return (
      this.host.nativeElement.querySelector<HTMLElement>(
        '[data-validation-scope="questionnaire"]',
      ) ?? this.host.nativeElement
    );
  }

  private invalidCandidates(scope: HTMLElement): HTMLElement[] {
    const candidates = Array.from(
      scope.querySelectorAll<HTMLElement>(
        [
          '[data-validation-anchor]',
          '[aria-invalid="true"]',
          'input.ng-invalid.ng-touched',
          'textarea.ng-invalid.ng-touched',
          'select.ng-invalid.ng-touched',
        ].join(','),
      ),
    ).filter((element) => this.isVisible(element));

    return candidates.sort((first, second) => {
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      return firstRect.top - secondRect.top || firstRect.left - secondRect.left;
    });
  }

  private validationScrollTarget(element: HTMLElement): HTMLElement {
    return (
      element.closest<HTMLElement>(
        [
          '[data-validation-card]',
          '.question-inline-block',
          '.lifestyle-substance',
          'app-text-input',
          'app-textarea',
          'app-number-input',
          'app-date-input',
          'app-option-toggle',
          'app-yes-no-toggle',
          'app-checkbox-input',
        ].join(','),
      ) ?? element
    );
  }

  private scrollToElement(element: HTMLElement): void {
    const offset = this.topOffset();
    const top = element.getBoundingClientRect().top + this.scrollY() - offset;
    this.scrollTo(Math.max(top, 0));
  }

  private scrollToTop(): void {
    this.scrollTo(0);
  }

  private scrollTo(top: number): void {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
      return;
    }

    window.scrollTo({ top, behavior: 'smooth' });
  }

  private topOffset(): number {
    if (typeof document === 'undefined') {
      return 96;
    }
    const topbar = document.querySelector<HTMLElement>('app-questionnaire-topbar > div')
      ?? document.querySelector<HTMLElement>('app-questionnaire-topbar');
    return (topbar?.getBoundingClientRect().height ?? 0) + 96;
  }

  private scrollY(): number {
    return typeof window === 'undefined' ? 0 : window.scrollY || window.pageYOffset || 0;
  }

  private focusInvalidControl(element: HTMLElement, target = element): void {
    const control = element.matches('input, textarea, select, button')
      ? element
      : (element.querySelector<HTMLElement>('input, textarea, select, button') ??
        target.querySelector<HTMLElement>('input, textarea, select, button'));
    control?.focus({ preventScroll: true });
  }

  private isVisible(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current && current !== this.host.nativeElement) {
      if (current.hidden) {
        return false;
      }
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  private scheduleAfterValidationRender(callback: () => void): void {
    this.scheduleFrame(() => this.scheduleFrame(callback));
  }

  private scheduleFrame(callback: () => void): void {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(callback);
      return;
    }

    setTimeout(callback, 0);
  }
}
