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

type ScoreMetricDefinition = {
  labelKey: DonutMetric['labelKey'];
  tone: DonutMetric['tone'];
  dashboardValue: (dashboard: ReviewDashboard) => number;
  personValue: (person: ReviewDashboardPerson) => number;
};

const SCORE_METRICS: readonly ScoreMetricDefinition[] = [
  {
    labelKey: 'review.healthScore',
    tone: 'health',
    dashboardValue: (dashboard) => dashboard.totals.averageHealthScore,
    personValue: (person) => person.healthScore,
  },
  {
    labelKey: 'review.riskScore',
    tone: 'risk',
    dashboardValue: (dashboard) => dashboard.totals.averageRiskScore,
    personValue: (person) => person.riskScore,
  },
  {
    labelKey: 'review.dentalLoad',
    tone: 'dental',
    dashboardValue: (dashboard) => dashboard.totals.averageDentalLoad,
    personValue: (person) => person.dentalLoad,
  },
];

const DONUT_TONE_COLORS: Record<DonutMetric['tone'], string> = {
  health: '#1f9d70',
  risk: '#d66728',
  dental: '#2f7fd1',
};

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [ReportChartsComponent, TranslatePipe],
  templateUrl: './report-dashboard.component.html',
  styleUrl: './report-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDashboardComponent {
  @Input({ required: true }) dashboard!: ReviewDashboard;

  protected donutMetrics(): DonutMetric[] {
    return SCORE_METRICS.map((metric) => ({
      labelKey: metric.labelKey,
      tone: metric.tone,
      value: metric.dashboardValue(this.dashboard),
    }));
  }

  protected personDonutMetrics(person: ReviewDashboardPerson): DonutMetric[] {
    return SCORE_METRICS.map((metric) => ({
      labelKey: metric.labelKey,
      tone: metric.tone,
      value: metric.personValue(person),
    }));
  }

  protected donutBackground(value: number, tone: DonutMetric['tone']): string {
    const percent = Math.max(0, Math.min(value, 100));
    const color = DONUT_TONE_COLORS[tone];
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
