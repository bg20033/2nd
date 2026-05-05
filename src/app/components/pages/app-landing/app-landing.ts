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
    'Damit wir auf Ihren Antrag individuell eingehen können, sind wir auf vollständige und detaillierte Beschreibungen angewiesen.',
    'Bitte nutzen Sie dazu auch die jeweiligen Bemerkungsfelder. Jeder der nachfolgenden Fragen muss von der zu versichernden Person oder vom gesetzlichen Vertreter persönlich und wahrheitsgetreu beantwortet werden.',
    'Unvollständige oder falsche Angaben gelten als Anzeigepflichtverletzung. Als Folge kann eine Kündigung des Vertrags oder ein Leistungsausschluss ausgesprochen werden.',
    'Helsana wird Ihre Daten vertraulich behandeln und nicht an Dritte weitergeben. Bitte lassen Sie keine Bemerkungsfelder leer.',
  ] as const;

  protected startDeclaration(): void {
    this.start.emit();
  }
}
