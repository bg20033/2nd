import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { AppProgressService } from '../../services/app-progress.service';
import { LanguageCode, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-header',
  imports: [TranslatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly i18n = inject(TranslationService);
  protected readonly progress = inject(AppProgressService);

  title = input('Gesundheitsdeklaration');
  showMenuButton = input(true);
  showLanguageButton = input(true);
  showProgress = input(true);
  fixed = input(true);

  menu = output<void>();
  languageChange = output<string>();

  protected readonly isLanguageMenuOpen = signal(false);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isLanguageMenuOpen.set(false);
    }
  }

  protected toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.isLanguageMenuOpen.update((open) => !open);
  }

  protected selectLanguage(code: string): void {
    if (!this.i18n.isLanguageCode(code)) {
      return;
    }

    this.i18n.setLanguage(code);
    this.isLanguageMenuOpen.set(false);
    this.languageChange.emit(code);
  }

  protected handleMenu(): void {
    this.menu.emit();
  }

  protected languageCode(): LanguageCode {
    return this.i18n.language();
  }
}
