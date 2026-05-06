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
    <section class="grid justify-items-center gap-[0.85rem] px-4 py-8 text-center">
      <div
        class="grid h-16 w-16 place-items-center rounded-full bg-[#7d29de] text-[14px] font-normal text-white"
        aria-hidden="true"
      >
        ✓
      </div>
      <h2 class="m-0 text-[14px] font-normal tracking-normal text-[#1d1426]">
        {{ 'review.completeTitle' | t }}
      </h2>
      <p class="max-w-96 text-[12px] font-normal leading-[1.45] text-[#6f657a]">
        {{ 'review.completeText' | t }}
      </p>
      <button
        class="button button-primary mt-[0.35rem] min-w-40"
        type="button"
        (click)="completed.emit()"
      >
        {{ 'review.backToStart' | t }}
      </button>
    </section>
  `,
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
