import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

type HeaderLanguage = {
  code: string;
  label: string;
  nativeLabel: string;
};

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly host = inject(ElementRef<HTMLElement>);

  title = input('Questionnaire');
  showMenuButton = input(true);
  showLanguageButton = input(true);
  fixed = input(true);

  menu = output<void>();
  languageChange = output<string>();

  protected readonly supportedLanguages: readonly HeaderLanguage[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'fr', label: 'French', nativeLabel: 'Français' },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
    { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
    { code: 'sq', label: 'Albanian', nativeLabel: 'Shqip' },
  ];
  protected readonly language = signal('en');
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
    this.language.set(code);
    this.isLanguageMenuOpen.set(false);
    this.languageChange.emit(code);
  }

  protected handleMenu(): void {
    this.menu.emit();
  }
}
