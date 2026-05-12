import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer implements AfterViewInit, OnDestroy {
  backDisabled = input(false);
  nextDisabled = input(false);
  backLabel = input('Back');
  nextLabel = input('Next');
  protected readonly keyboardOpen = signal(false);

  back = output<void>();
  next = output<void>();
  chat = output<void>();
  voice = output<void>();

  private readonly zone = inject(NgZone);
  private cleanupListeners: Array<() => void> = [];
  private focusOutTimer = 0;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const update = () => this.updateKeyboardState();
      const updateSoon = () => window.setTimeout(update, 40);
      const focusOut = () => {
        window.clearTimeout(this.focusOutTimer);
        this.focusOutTimer = window.setTimeout(update, 140);
      };

      window.addEventListener('resize', updateSoon, { passive: true });
      document.addEventListener('focusin', updateSoon, true);
      document.addEventListener('focusout', focusOut, true);
      this.cleanupListeners.push(
        () => window.removeEventListener('resize', updateSoon),
        () => document.removeEventListener('focusin', updateSoon, true),
        () => document.removeEventListener('focusout', focusOut, true),
      );

      const viewport = window.visualViewport;
      if (viewport) {
        viewport.addEventListener('resize', updateSoon, { passive: true });
        viewport.addEventListener('scroll', updateSoon, { passive: true });
        this.cleanupListeners.push(
          () => viewport.removeEventListener('resize', updateSoon),
          () => viewport.removeEventListener('scroll', updateSoon),
        );
      }

      update();
    });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.clearTimeout(this.focusOutTimer);
    }
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
  }

  protected handleBack(): void {
    if (this.backDisabled()) {
      return;
    }

    this.back.emit();
  }

  protected handleNext(): void {
    if (this.nextDisabled()) {
      return;
    }

    this.next.emit();
  }

  protected handleChat(): void {
    this.chat.emit();
  }

  protected handleVoice(): void {
    this.voice.emit();
  }

  private updateKeyboardState(): void {
    const next = this.isMobileKeyboardOpen();
    this.zone.run(() => this.keyboardOpen.set(next));
  }

  private isMobileKeyboardOpen(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    const activeElement = document.activeElement;
    const isEditing =
      (activeElement instanceof HTMLInputElement && activeElement.type !== 'date') ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement?.getAttribute('contenteditable') === 'true';

    if (!isEditing || window.innerWidth > 820) {
      return false;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return true;
    }

    return window.innerHeight - viewport.height > 120;
  }
}
