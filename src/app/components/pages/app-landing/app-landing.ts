import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { Footer } from '../../footer/footer';
import { Header } from '../../header/header';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-landing',
  imports: [Footer, Header, TranslatePipe],
  templateUrl: './app-landing.html',
  styleUrl: './app-landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLanding {
  readonly start = output<void>();

  protected readonly introParagraphs = ['landing.intro1', 'landing.intro2', 'landing.intro3', 'landing.intro4'] as const;

  protected startDeclaration(): void {
    this.start.emit();
  }
}
