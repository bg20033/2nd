import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import type {
  ReviewCategoryScores,
  ReviewDashboard,
  ReviewDashboardPerson,
  ReviewRiskCategory,
  ReviewRiskDriver,
} from '../../../../services/health-declaration-report.types';
import { TranslatePipe } from '../../../../pipes/translate.pipe';
import { ReportChartsComponent } from './report-charts.component';

type DonutMetric = {
  labelKey: string;
  value: number;
  tone: 'health' | 'risk' | 'dental';
};

type CategoryEntry = {
  category: ReviewRiskCategory;
  value: number;
  percent: number;
};

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [ReportChartsComponent, TranslatePipe],
  template: `
    <section class="report-dashboard" aria-labelledby="report-title">
      <div class="report-hero">
        <div class="report-hero__copy">
          <span class="report-eyebrow">{{ 'report.eyebrow' | t }}</span>
          <h2 id="report-title">{{ 'report.title' | t }}</h2>
          <p>{{ 'report.subtitle' | t }}</p>
        </div>

        <div class="report-hero__estimate">
          <span>{{ 'review.totalEstimate' | t }}</span>
          <strong>{{ dashboard.totals.monthlyLabel }}</strong>
        </div>
      </div>

      <div class="report-donuts" aria-label="Report score charts">
        @for (metric of donutMetrics(); track metric.labelKey) {
          <article [class]="'report-donut-card report-donut-card--' + metric.tone">
            <div
              class="report-donut"
              [style.background]="donutBackground(metric.value, metric.tone)"
              aria-hidden="true"
            >
              <span>{{ metric.value }}</span>
            </div>
            <div>
              <span>{{ metric.labelKey | t }}</span>
              <strong>{{ metric.value }}/100</strong>
            </div>
          </article>
        }
      </div>

      <app-report-charts [dashboard]="dashboard" />

      <div class="report-grid">
        <article class="report-panel report-panel--drivers">
          <div class="report-panel__head">
            <span>{{ 'report.topDrivers' | t }}</span>
            <strong>{{ dashboard.totals.rawRiskPoints }}</strong>
          </div>

          <div class="report-driver-list report-scroll-list">
            @for (driver of dashboard.totals.topDrivers; track driver.id + driver.rank + (driver.personId ?? '')) {
              <div [class]="'report-driver report-driver--' + driver.severity">
                <span class="report-driver__rank">{{ driver.rank }}</span>
                <div class="report-driver__body">
                  <div class="report-driver__top">
                    <strong>{{ driver.questionLabel }}</strong>
                    <span [class]="driverSeverityClass(driver)">{{ driver.points }}</span>
                  </div>
                  <p>{{ driver.answerLabel }}</p>
                  @if (driver.personLabel) {
                    <small>{{ driver.personLabel }} / {{ ('report.category.' + driver.category) | t }}</small>
                  } @else {
                    <small>{{ ('report.category.' + driver.category) | t }}</small>
                  }
                </div>
              </div>
            } @empty {
              <p class="report-empty-copy">{{ 'report.noDrivers' | t }}</p>
            }
          </div>
        </article>

        <article class="report-panel">
          <div class="report-panel__head">
            <span>{{ 'report.categoryBreakdown' | t }}</span>
            <strong>{{ dashboard.totals.rawRiskPoints }}</strong>
          </div>

          <div class="report-category-list">
            @for (entry of categoryEntries(dashboard.totals.categoryScores); track entry.category) {
              <div class="report-category">
                <div class="report-category__label">
                  <span>{{ ('report.category.' + entry.category) | t }}</span>
                  <strong>{{ entry.value }}</strong>
                </div>
                <div class="report-category__track">
                  <div
                    [class]="categoryBarClass(entry.category)"
                    [style.width]="entry.percent + '%'"
                  ></div>
                </div>
              </div>
            }
          </div>
        </article>
      </div>

      <div class="report-people report-scroll-list">
        @for (person of dashboard.people; track person.id) {
          <article [class]="'report-person report-person--' + person.riskLevel">
            <div class="report-person__head">
              <div>
                <h3>{{ person.label }}</h3>
                <p>{{ person.gender || ('genderOther' | t) }} / {{ person.birthYear }} / {{ person.estimatedMonthlyLabel }}</p>
              </div>
              <span [class]="riskClass(person)">{{ ('review.risk.' + person.riskLevel) | t }}</span>
            </div>

            <div class="report-person__body">
              <div class="report-mini-donuts">
                @for (metric of personDonutMetrics(person); track metric.labelKey) {
                  <div class="report-mini">
                    <div class="report-mini__chart" [style.background]="donutBackground(metric.value, metric.tone)">
                      <span>{{ metric.value }}</span>
                    </div>
                    <small>{{ metric.labelKey | t }}</small>
                  </div>
                }
              </div>

              <div class="report-person__drivers">
                <span>{{ 'report.personDrivers' | t }}</span>
                @for (driver of person.topDrivers.slice(0, 3); track driver.id) {
                  <div class="report-person-driver">
                    <strong>{{ driver.questionLabel }}</strong>
                    <span>{{ driver.points }}</span>
                    <small>{{ driver.answerLabel }}</small>
                  </div>
                } @empty {
                  <p class="report-empty-copy">{{ 'report.noDrivers' | t }}</p>
                }
              </div>
            </div>

            <div class="report-person__metrics">
              <div>
                <span>{{ 'review.positiveAnswers' | t }}</span>
                <strong>{{ person.positiveAnswers }}</strong>
              </div>
              <div>
                <span>{{ 'review.diagnoses' | t }}</span>
                <strong>{{ person.diagnosisCount }}</strong>
              </div>
              <div>
                <span>{{ 'report.rawRiskPoints' | t }}</span>
                <strong>{{ person.rawRiskPoints }}</strong>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .report-dashboard {
      display: grid;
      gap: 0.85rem;
      min-width: 0;
      padding: 1rem;
      border-radius: 1.25rem;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(247, 250, 248, 0.9)),
        #f3eff7;
      color: #1d1426;
    }

    .report-hero,
    .report-donuts,
    .report-grid,
    .report-person__head,
    .report-person__body,
    .report-person__metrics {
      display: grid;
      gap: 0.85rem;
      min-width: 0;
    }

    .report-hero {
      grid-template-columns: minmax(0, 1fr) minmax(13rem, auto);
      align-items: stretch;
      padding: 1rem;
      border: 1px solid rgba(116, 63, 154, 0.18);
      border-radius: 1rem;
      background:
        linear-gradient(135deg, #ffffff 0%, #f8fbff 46%, #eef7f0 100%);
      box-shadow: 0 18px 40px rgba(47, 37, 73, 0.08);
    }

    .report-eyebrow {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 0.4rem;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: rgba(31, 157, 112, 0.12);
      color: #116247;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .report-dashboard h2,
    .report-person h3 {
      margin: 0;
      color: #1d1426;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.15;
    }

    .report-dashboard p {
      margin: 0.3rem 0 0;
      color: #706876;
      font-size: 12px;
      line-height: 1.45;
    }

    .report-hero__estimate,
    .report-donut-card,
    .report-panel,
    .report-person,
    .report-person__metrics > div {
      min-width: 0;
      border: 1px solid rgba(202, 186, 220, 0.78);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 12px 26px rgba(47, 37, 73, 0.06);
    }

    .report-hero__estimate {
      display: grid;
      align-content: center;
      gap: 0.35rem;
      padding: 0.85rem;
    }

    .report-hero__estimate span,
    .report-donut-card span,
    .report-panel__head span,
    .report-category__label span,
    .report-person__metrics span,
    .report-person__drivers > span,
    .report-mini small {
      color: #706876;
      font-size: 12px;
      line-height: 1.2;
    }

    .report-hero__estimate strong {
      color: #1d1426;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.15;
    }

    .report-donuts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .report-donut-card {
      --metric-color: #1f9d70;
      display: grid;
      position: relative;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
      padding: 0.85rem;
    }

    .report-donut-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 0.25rem;
      background: var(--metric-color);
    }

    .report-donut-card--health {
      --metric-color: #1f9d70;
    }

    .report-donut-card--risk {
      --metric-color: #d66728;
    }

    .report-donut-card--dental {
      --metric-color: #2f7fd1;
    }

    .report-donut,
    .report-mini__chart {
      display: grid;
      place-items: center;
      position: relative;
      border-radius: 50%;
      flex: 0 0 auto;
    }

    .report-donut {
      width: 5rem;
      height: 5rem;
      box-shadow: 0 12px 24px rgba(47, 37, 73, 0.08);
    }

    .report-mini__chart {
      width: 3.35rem;
      height: 3.35rem;
    }

    .report-donut::after,
    .report-mini__chart::after {
      content: '';
      position: absolute;
      inset: 0.65rem;
      border-radius: inherit;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(202, 186, 220, 0.5);
    }

    .report-mini__chart::after {
      inset: 0.42rem;
    }

    .report-donut span,
    .report-mini__chart span {
      position: relative;
      z-index: 1;
      color: #1d1426;
      font-size: 16px;
      font-weight: 800;
    }

    .report-mini__chart span {
      font-size: 13px;
    }

    .report-donut-card strong {
      display: block;
      margin-top: 0.25rem;
      color: #1d1426;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.15;
    }

    .report-grid {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .report-panel {
      display: grid;
      align-content: start;
      gap: 0.65rem;
      padding: 0.75rem;
    }

    .report-panel--drivers {
      min-height: 0;
    }

    .report-panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-width: 0;
    }

    .report-panel__head strong {
      color: #1d1426;
      font-size: 18px;
      font-weight: 800;
    }

    .report-driver-list,
    .report-category-list,
    .report-people,
    .report-person__drivers {
      display: grid;
      gap: 0.5rem;
      min-width: 0;
    }

    .report-scroll-list {
      overflow: auto;
      overscroll-behavior: contain;
      padding-right: 0.25rem;
      scrollbar-color: rgba(116, 63, 154, 0.32) transparent;
      scrollbar-gutter: stable;
      scrollbar-width: thin;
    }

    .report-driver-list {
      max-height: min(22rem, 54vh);
    }

    .report-people {
      max-height: min(43rem, 76vh);
    }

    .report-driver {
      display: grid;
      grid-template-columns: 1.65rem minmax(0, 1fr);
      gap: 0.5rem;
      min-width: 0;
      padding: 0.5rem;
      border: 1px solid rgba(202, 186, 220, 0.58);
      border-left: 0.2rem solid #1f9d70;
      border-radius: 0.55rem;
      background: #ffffff;
    }

    .report-driver--medium {
      border-left-color: #d0a028;
    }

    .report-driver--high {
      border-left-color: #d66728;
    }

    .report-driver--critical {
      border-left-color: #d81837;
    }

    .report-driver__rank {
      display: grid;
      place-items: center;
      width: 1.65rem;
      height: 1.65rem;
      border-radius: 50%;
      background: #1d1426;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
    }

    .report-driver__body,
    .report-driver__top {
      min-width: 0;
    }

    .report-driver__top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.4rem;
      align-items: start;
    }

    .report-driver strong,
    .report-person-driver strong {
      display: block;
      overflow-wrap: anywhere;
      color: #1d1426;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1.25;
    }

    .report-driver p,
    .report-driver small,
    .report-person-driver small {
      display: block;
      overflow-wrap: anywhere;
      color: #706876;
      font-size: 10.5px;
      line-height: 1.3;
    }

    .report-driver p {
      margin: 0.12rem 0;
    }

    .report-severity {
      display: inline-flex;
      justify-content: center;
      min-width: 1.8rem;
      padding: 0.12rem 0.35rem;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.2;
    }

    .report-severity--low {
      background: rgba(31, 157, 112, 0.12);
      color: #116247;
    }

    .report-severity--medium {
      background: rgba(208, 160, 40, 0.18);
      color: #76520f;
    }

    .report-severity--high {
      background: rgba(216, 103, 40, 0.14);
      color: #8a3e10;
    }

    .report-severity--critical {
      background: rgba(216, 24, 55, 0.12);
      color: #9b1028;
    }

    .report-category {
      display: grid;
      gap: 0.35rem;
    }

    .report-category__label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .report-category__label strong {
      color: #1d1426;
      font-size: 12px;
      font-weight: 800;
    }

    .report-category__track {
      height: 0.5rem;
      overflow: hidden;
      border-radius: 999px;
      background: #e6d9f4;
    }

    .report-category__bar {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #1f9d70, #48b690);
    }

    .report-category__bar--dental {
      background: linear-gradient(90deg, #2f7fd1, #6fb5ef);
    }

    .report-category__bar--lifestyle {
      background: linear-gradient(90deg, #d0a028, #e7c966);
    }

    .report-category__bar--insurance {
      background: linear-gradient(90deg, #76520f, #b98b2a);
    }

    .report-category__bar--demographic {
      background: linear-gradient(90deg, #6d5bd1, #9a8df0);
    }

    .report-category__bar--financial {
      background: linear-gradient(90deg, #d66728, #ee9a5f);
    }

    .report-person {
      display: grid;
      position: relative;
      gap: 0.65rem;
      overflow: hidden;
      padding: 0.75rem;
    }

    .report-person::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 0.3rem;
      background: #1f9d70;
    }

    .report-person--medium::before {
      background: #d0a028;
    }

    .report-person--high::before {
      background: #d66728;
    }

    .report-person--critical::before {
      background: #d81837;
    }

    .report-person__head {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }

    .report-person__body {
      grid-template-columns: minmax(10.5rem, 0.62fr) minmax(0, 1fr);
      align-items: start;
    }

    .report-mini-donuts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
      min-width: 0;
    }

    .report-mini {
      display: grid;
      justify-items: center;
      gap: 0.25rem;
      min-width: 0;
      text-align: center;
    }

    .report-person-driver {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.15rem 0.45rem;
      min-width: 0;
      padding: 0.45rem;
      border-radius: 0.45rem;
      background: #f9fbfb;
    }

    .report-person-driver span {
      grid-row: span 2;
      align-self: center;
      color: #1d1426;
      font-size: 13px;
      font-weight: 800;
    }

    .report-person-driver small {
      grid-column: 1;
    }

    .report-person__metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .report-person__metrics > div {
      display: grid;
      gap: 0.18rem;
      padding: 0.5rem;
    }

    .report-person__metrics strong {
      color: #1d1426;
      font-size: 14px;
      font-weight: 800;
    }

    .report-pill {
      display: inline-flex;
      align-items: center;
      min-height: 1.7rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .report-pill--low {
      background: rgba(31, 157, 112, 0.14);
      color: #116247;
    }

    .report-pill--medium {
      background: rgba(208, 160, 40, 0.18);
      color: #76520f;
    }

    .report-pill--high,
    .report-pill--critical {
      background: rgba(216, 24, 55, 0.12);
      color: #9b1028;
    }

    .report-empty-copy {
      margin: 0;
      color: #706876;
      font-size: 12px;
      line-height: 1.4;
    }

    @media (max-width: 860px) {
      .report-hero,
      .report-grid,
      .report-person__body {
        grid-template-columns: 1fr;
      }

      .report-donuts {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .report-dashboard {
        padding: 0.75rem;
        border-radius: 1rem;
      }

      .report-hero {
        padding: 0.85rem;
      }

      .report-donut-card,
      .report-person__head,
      .report-person__metrics {
        grid-template-columns: 1fr;
      }

      .report-mini-donuts {
        grid-template-columns: repeat(3, minmax(4rem, 1fr));
        overflow-x: auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDashboardComponent {
  @Input({ required: true }) dashboard!: ReviewDashboard;

  protected donutMetrics(): DonutMetric[] {
    return [
      {
        labelKey: 'review.healthScore',
        value: this.dashboard.totals.averageHealthScore,
        tone: 'health',
      },
      {
        labelKey: 'review.riskScore',
        value: this.dashboard.totals.averageRiskScore,
        tone: 'risk',
      },
      {
        labelKey: 'review.dentalLoad',
        value: this.dashboard.totals.averageDentalLoad,
        tone: 'dental',
      },
    ];
  }

  protected personDonutMetrics(person: ReviewDashboardPerson): DonutMetric[] {
    return [
      {
        labelKey: 'review.healthScore',
        value: person.healthScore,
        tone: 'health',
      },
      {
        labelKey: 'review.riskScore',
        value: person.riskScore,
        tone: 'risk',
      },
      {
        labelKey: 'review.dentalLoad',
        value: person.dentalLoad,
        tone: 'dental',
      },
    ];
  }

  protected donutBackground(value: number, tone: DonutMetric['tone']): string {
    const percent = Math.max(0, Math.min(value, 100));
    const color = tone === 'health' ? '#1f9d70' : tone === 'risk' ? '#d66728' : '#2f7fd1';
    return `conic-gradient(${color} ${percent * 3.6}deg, #e6d9f4 0deg)`;
  }

  protected categoryEntries(scores: ReviewCategoryScores): CategoryEntry[] {
    const entries = (Object.entries(scores) as Array<[ReviewRiskCategory, number]>)
      .filter(([, value]) => value > 0)
      .sort(([, a], [, b]) => b - a);
    const max = Math.max(...entries.map(([, value]) => value), 1);
    return entries.map(([category, value]) => ({
      category,
      value,
      percent: Math.max(6, Math.round((value / max) * 100)),
    }));
  }

  protected riskClass(person: ReviewDashboardPerson): string {
    return `report-pill report-pill--${person.riskLevel}`;
  }

  protected categoryBarClass(category: ReviewRiskCategory): string {
    return `report-category__bar report-category__bar--${category}`;
  }

  protected driverSeverityClass(driver: ReviewRiskDriver): string {
    return `report-severity report-severity--${driver.severity}`;
  }
}
