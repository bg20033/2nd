import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { ReviewDashboard } from '../../../../services/health-declaration-report.types';
import { HealthDeclarationReportService } from '../../../../services/health-declaration-report.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { ReportDashboardComponent } from './report-dashboard.component';

@Component({
  selector: 'app-report-page',
  standalone: true,
  imports: [ReportDashboardComponent, RouterLink, TranslatePipe],
  template: `
    <main class="app-content app-content--review report-page">
      @if (loading()) {
        <section class="report-empty" aria-live="polite">
          <div class="report-empty__icon" aria-hidden="true">...</div>
          <h2>{{ 'report.loadingTitle' | t }}</h2>
          <p>{{ 'report.loadingText' | t }}</p>
        </section>
      } @else if (dashboard(); as report) {
        <app-report-dashboard [dashboard]="report" />
      } @else {
        <section class="report-empty" aria-labelledby="report-invalid-title">
          <div class="report-empty__icon" aria-hidden="true">!</div>
          <h2 id="report-invalid-title">{{ 'report.invalidTitle' | t }}</h2>
          <p>{{ 'report.invalidText' | t }}</p>
          <a class="report-empty__button" routerLink="/landing">{{ 'review.backToStart' | t }}</a>
        </section>
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .report-page {
      align-content: start;
      width: min(980px, calc(100% - 2rem));
      padding-top: 2rem;
    }

    .report-empty {
      display: grid;
      justify-items: center;
      gap: 0.85rem;
      min-width: 0;
      padding: 1.25rem;
      border-radius: 1.75rem;
      background: var(--panel-bg);
      color: #1d1426;
      text-align: center;
    }

    .report-empty__icon {
      display: grid;
      width: 2.4rem;
      height: 2.4rem;
      place-items: center;
      border-radius: 999px;
      background: rgba(216, 24, 55, 0.12);
      color: #9b1028;
      font-size: 1rem;
      font-weight: 500;
    }

    .report-empty h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.25;
    }

    .report-empty p {
      max-width: 27rem;
      margin: 0;
      color: #706876;
      font-size: 12px;
      line-height: 1.45;
    }

    .report-empty__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 10rem;
      min-height: var(--control-height);
      padding: 0 1.25rem;
      border-radius: 0.9rem;
      background: #8425e5;
      color: #ffffff;
      font-size: 14px;
      text-decoration: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPageComponent {
  protected readonly dashboard = signal<ReviewDashboard | null>(null);
  protected readonly loading = signal(true);

  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(HealthDeclarationReportService);

  constructor() {
    const token = this.route.snapshot.paramMap.get('token');
    void this.loadReport(token);
  }

  private async loadReport(token: string | null): Promise<void> {
    this.dashboard.set(await this.reportService.fetchReportForToken(token));
    this.loading.set(false);
  }
}
