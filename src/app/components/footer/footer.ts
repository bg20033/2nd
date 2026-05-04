import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  backDisabled = input(false);
  nextDisabled = input(false);
  backLabel = input('Back');
  nextLabel = input('Next');

  back = output<void>();
  next = output<void>();
  chat = output<void>();
  voice = output<void>();

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
}
