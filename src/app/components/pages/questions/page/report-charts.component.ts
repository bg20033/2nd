import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartOptions } from 'chart.js';

import type {
  ReviewDashboard,
  ReviewRiskCategory,
  ReviewRiskDriver,
  ReviewRiskSeverity,
} from '../../../../services/health-declaration-report.types';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

type ChartCanvas = ElementRef<HTMLCanvasElement>;
type CategoryChartEntry = {
  category: ReviewRiskCategory;
  label: string;
  value: number;
  color: string;
};

const CATEGORY_COLORS: Record<ReviewRiskCategory, string> = {
  medical: '#1f9d70',
  dental: '#2f7fd1',
  lifestyle: '#d0a028',
  insurance: '#76520f',
  demographic: '#6d5bd1',
  financial: '#d66728',
};

const SEVERITY_COLORS: Record<ReviewRiskSeverity, string> = {
  low: '#1f9d70',
  medium: '#d0a028',
  high: '#d66728',
  critical: '#d81837',
};

@Component({
  selector: 'app-report-charts',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="report-chart-grid" aria-label="Report analytics charts">
      <article class="report-chart-card">
        <div class="report-chart-card__head">
          <span>{{ 'report.categoryBreakdown' | t }}</span>
          <strong>{{ dashboard.totals.rawRiskPoints }}</strong>
        </div>
        <div class="report-chart-wrap">
          <canvas #categoryCanvas role="img" aria-label="Risk category breakdown chart"></canvas>
        </div>
      </article>

      <article class="report-chart-card report-chart-card--wide">
        <div class="report-chart-card__head">
          <span>{{ 'review.peopleCount' | t }}</span>
          <strong>{{ dashboard.totals.people }}</strong>
        </div>
        <div class="report-chart-wrap">
          <canvas #scoreCanvas role="img" aria-label="Person score comparison chart"></canvas>
        </div>
      </article>

      <article class="report-chart-card report-chart-card--wide">
        <div class="report-chart-card__head">
          <span>{{ 'report.topDrivers' | t }}</span>
          <strong>{{ dashboard.totals.topDrivers.length }}</strong>
        </div>
        <div class="report-chart-wrap">
          <canvas #driversCanvas role="img" aria-label="Top risk drivers chart"></canvas>
        </div>
      </article>

      <article class="report-chart-card">
        <div class="report-chart-card__head">
          <span>{{ 'review.totalEstimate' | t }}</span>
          <strong>{{ dashboard.totals.monthlyLabel }}</strong>
        </div>
        <div class="report-chart-wrap">
          <canvas #costCanvas role="img" aria-label="Estimated CHF monthly cost chart"></canvas>
        </div>
      </article>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .report-chart-grid {
      display: grid;
      grid-template-columns: minmax(17rem, 0.82fr) minmax(0, 1.18fr);
      gap: 0.85rem;
      min-width: 0;
    }

    .report-chart-card {
      display: grid;
      gap: 0.75rem;
      min-width: 0;
      padding: 0.9rem;
      border: 1px solid rgba(202, 186, 220, 0.78);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 12px 26px rgba(47, 37, 73, 0.06);
    }

    .report-chart-card--wide {
      min-height: 17rem;
    }

    .report-chart-card__head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
      min-width: 0;
    }

    .report-chart-card__head span {
      color: #706876;
      font-size: 12px;
      line-height: 1.2;
    }

    .report-chart-card__head strong {
      max-width: 11rem;
      overflow-wrap: anywhere;
      color: #1d1426;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.15;
      text-align: right;
    }

    .report-chart-wrap {
      position: relative;
      min-width: 0;
      height: 14rem;
    }

    @media (max-width: 860px) {
      .report-chart-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .report-chart-card {
        padding: 0.75rem;
      }

      .report-chart-card__head {
        display: grid;
      }

      .report-chart-card__head strong {
        max-width: none;
        text-align: left;
      }

      .report-chart-wrap {
        height: 13rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportChartsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) dashboard!: ReviewDashboard;

  @ViewChild('categoryCanvas') private categoryCanvas?: ChartCanvas;
  @ViewChild('scoreCanvas') private scoreCanvas?: ChartCanvas;
  @ViewChild('driversCanvas') private driversCanvas?: ChartCanvas;
  @ViewChild('costCanvas') private costCanvas?: ChartCanvas;

  private readonly i18n = inject(TranslationService);
  private readonly charts: Chart[] = [];
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && changes['dashboard']) {
      queueMicrotask(() => this.renderCharts());
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private renderCharts(): void {
    if (!this.categoryCanvas || !this.scoreCanvas || !this.driversCanvas || !this.costCanvas) {
      return;
    }

    this.destroyCharts();
    this.charts.push(
      new Chart(this.categoryCanvas.nativeElement, this.categoryConfig()),
      new Chart(this.scoreCanvas.nativeElement, this.scoreConfig()),
      new Chart(this.driversCanvas.nativeElement, this.driversConfig()),
      new Chart(this.costCanvas.nativeElement, this.costConfig()),
    );
  }

  private destroyCharts(): void {
    while (this.charts.length) {
      this.charts.pop()?.destroy();
    }
  }

  private categoryConfig(): ChartConfiguration<'doughnut', number[], string> {
    const entries = this.categoryEntries();

    return {
      type: 'doughnut',
      data: {
        labels: entries.map((entry) => entry.label),
        datasets: [{
          data: entries.map((entry) => entry.value),
          backgroundColor: entries.map((entry) => entry.color),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        ...this.doughnutOptions(),
        plugins: {
          ...this.doughnutOptions().plugins,
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              color: '#706876',
              font: { size: 11 },
            },
          },
        },
      },
    };
  }

  private scoreConfig(): ChartConfiguration<'bar', number[], string> {
    const people = this.dashboard.people;

    return {
      type: 'bar',
      data: {
        labels: people.map((person) => person.label),
        datasets: [
          {
            label: this.i18n.translate('review.healthScore'),
            data: people.map((person) => person.healthScore),
            backgroundColor: '#1f9d70',
            borderRadius: 8,
          },
          {
            label: this.i18n.translate('review.riskScore'),
            data: people.map((person) => person.riskScore),
            backgroundColor: '#d66728',
            borderRadius: 8,
          },
          {
            label: this.i18n.translate('review.dentalLoad'),
            data: people.map((person) => person.dentalLoad),
            backgroundColor: '#2f7fd1',
            borderRadius: 8,
          },
        ],
      },
      options: this.barOptions(100),
    };
  }

  private driversConfig(): ChartConfiguration<'bar', number[], string> {
    const drivers = this.dashboard.totals.topDrivers.slice(0, 8);
    const chartDrivers = drivers.length ? drivers : [this.emptyDriver()];

    return {
      type: 'bar',
      data: {
        labels: chartDrivers.map((driver) => this.shortLabel(driver.questionLabel)),
        datasets: [{
          label: this.i18n.translate('report.rawRiskPoints'),
          data: chartDrivers.map((driver) => driver.points),
          backgroundColor: chartDrivers.map((driver) => SEVERITY_COLORS[driver.severity]),
          borderRadius: 8,
        }],
      },
      options: {
        ...this.barOptions(Math.max(30, ...chartDrivers.map((driver) => driver.points)), true),
        indexAxis: 'y',
        plugins: {
          ...this.barOptions().plugins,
          legend: { display: false },
        },
      },
    };
  }

  private costConfig(): ChartConfiguration<'bar', number[], string> {
    const people = this.dashboard.people;

    return {
      type: 'bar',
      data: {
        labels: people.map((person) => person.label),
        datasets: [
          {
            label: 'Min CHF',
            data: people.map((person) => person.estimatedMonthlyMinChf),
            backgroundColor: '#8fd4bc',
            borderRadius: 8,
          },
          {
            label: 'Max CHF',
            data: people.map((person) => person.estimatedMonthlyMaxChf),
            backgroundColor: '#6d5bd1',
            borderRadius: 8,
          },
        ],
      },
      options: {
        ...this.barOptions(),
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#706876', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(202, 186, 220, 0.45)' },
            ticks: {
              color: '#706876',
              font: { size: 11 },
              callback: (value) => `CHF ${value}`,
            },
          },
        },
      },
    };
  }

  private doughnutOptions(): ChartOptions<'doughnut'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      animation: {
        duration: 700,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          labels: {
            color: '#706876',
            boxWidth: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1d1426',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 10,
          displayColors: true,
        },
      },
    };
  }

  private barOptions(max?: number, horizontal = false): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          labels: {
            color: '#706876',
            boxWidth: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1d1426',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 10,
          displayColors: true,
        },
      },
      scales: horizontal ? this.horizontalScales(max) : this.verticalScales(max),
    };
  }

  private verticalScales(max?: number): NonNullable<ChartOptions<'bar'>['scales']> {
    return {
      x: {
        grid: { display: false },
        ticks: { color: '#706876', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        max,
        grid: { color: 'rgba(202, 186, 220, 0.45)' },
        ticks: { color: '#706876', font: { size: 11 } },
      },
    };
  }

  private horizontalScales(max?: number): NonNullable<ChartOptions<'bar'>['scales']> {
    return {
      x: {
        beginAtZero: true,
        max,
        grid: { color: 'rgba(202, 186, 220, 0.45)' },
        ticks: { color: '#706876', font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#706876', font: { size: 11 } },
      },
    };
  }

  private categoryEntries(): CategoryChartEntry[] {
    const entries = (Object.entries(this.dashboard.totals.categoryScores) as Array<[ReviewRiskCategory, number]>)
      .filter(([, value]) => value > 0)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      return [{
        category: 'medical',
        label: this.i18n.translate('report.noDrivers'),
        value: 1,
        color: '#cabadc',
      }];
    }

    return entries.map(([category, value]) => ({
      category,
      value,
      label: this.i18n.translate(`report.category.${category}`),
      color: CATEGORY_COLORS[category],
    }));
  }

  private emptyDriver(): ReviewRiskDriver {
    return {
      id: 'no-risk',
      rank: 0,
      category: 'medical',
      questionPath: 'no-risk',
      questionLabel: this.i18n.translate('report.noDrivers'),
      answerLabel: '',
      points: 0,
      severity: 'low',
      explanation: '',
    };
  }

  private shortLabel(value: string): string {
    return value.length > 34 ? `${value.slice(0, 31)}...` : value;
  }
}
