import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Footer } from '../../../footer/footer';
import { HealthDeclarationFormService } from '../../../../services/health-declaration-form.service';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { DentalQuestionsSectionComponent } from '../sections/dental-questions-section.component';
import { MedicalQuestionsSectionComponent } from '../sections/medical-questions-section.component';
import { ReviewPanelComponent } from './review-panel.component';
import { QuestionnaireTopbarComponent } from './questionnaire-topbar.component';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor(declaration: HealthDeclarationFormService) {
    this.declaration = declaration;
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawIndex = params.get('index');

      if (rawIndex === null) {
        if (this.router.url.startsWith('/review')) {
          this.declaration.enterReviewMode();
          return;
        }

        void this.router.navigateByUrl(`/questions/person/${this.declaration.currentPersonIndex()}`, { replaceUrl: true });
        return;
      }

      const index = Number(rawIndex);
      if (Number.isInteger(index)) {
        this.declaration.visitPerson(index);
        this.validationAttempted.set(false);
      }
    });
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
      void this.router.navigateByUrl('/review');
      this.scheduleFrame(() => this.scrollToTop());
      return;
    }

    void this.router.navigateByUrl(`/questions/person/${this.declaration.currentPersonIndex()}`);
    this.scheduleFrame(() => {
      this.scrollToTop();
      this.nextClickLocked.set(false);
    });
  }

  goBack(): void {
    const currentIndex = this.declaration.currentPersonIndex();
    if (currentIndex > 0) {
      this.validationAttempted.set(false);
      void this.router.navigateByUrl(`/questions/person/${currentIndex - 1}`);
      this.scheduleFrame(() => this.scrollToTop());
      return;
    }

    this.back.emit();
    void this.router.navigateByUrl('/family');
  }

  completeReview(): void {
    this.declaration.startNewDeclaration();
    this.completed.emit();
    void this.router.navigateByUrl('/landing');
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
