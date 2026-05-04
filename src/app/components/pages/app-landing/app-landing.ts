import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { Footer } from '../../footer/footer';
import { Header } from '../../header/header';

@Component({
  selector: 'app-landing',
  imports: [Footer, Header],
  templateUrl: './app-landing.html',
  styleUrl: './app-landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLanding {
  readonly start = output<void>();

  protected readonly introParagraphs = [
    'So that we can review your application individually, we rely on complete and detailed information.',
    'Please also use the remark fields provided. Each of the following questions must be answered personally and truthfully by the person to be insured or by their legal representative.',
    'Incomplete or incorrect information is considered a breach of the duty to disclose. This may result in termination of the contract or exclusion of benefits.',
    'Helsana will treat your data confidentially and will not share it with third parties. Please do not leave any remark fields blank.',
  ] as const;

  protected startDeclaration(): void {
    this.start.emit();
  }
}
