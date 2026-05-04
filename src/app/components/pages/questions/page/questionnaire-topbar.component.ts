import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Header } from '../../../header/header';
import { HealthDeclarationFormService, PersonStepStatus } from '../../../../services/health-declaration-form.service';

type PersonTab = {
  id: string;
  index: number;
  label: string;
  state: PersonStepStatus;
  canOpen: boolean;
  completed: boolean;
  avatarSrc: string;
};

@Component({
  selector: 'app-questionnaire-topbar',
  standalone: true,
  imports: [Header],
  templateUrl: './questionnaire-topbar.component.html',
  styles: [`
    :host {
      display: block;
    }

    .topbar-scroll {
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .topbar__row {
      width: 100%;
    }

    :host ::ng-deep .questionnaire-topbar__header .global-header {
      grid-template-columns: 0.4rem minmax(0, 1fr) 2.25rem;
      gap: 0.55rem;
    }

    :host ::ng-deep .questionnaire-topbar__header .global-header__spacer {
      width: 0.4rem;
    }

    :host ::ng-deep .questionnaire-topbar__header .global-header__title {
      padding: 0;
      font-size: 24px;
    }

    .topbar-scroll::-webkit-scrollbar {
      display: none;
    }

    .topbar-scroll-indicator {
      height: 8px;
      margin: 0 0.55rem 0.1rem;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(140, 73, 255, 0.14);
    }

    .topbar-scroll-thumb {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: rgba(140, 73, 255, 0.65);
      transition:
        transform 160ms ease-out,
        width 160ms ease-out;
    }

    .topbar-tab--interactive {
      cursor: pointer;
    }

    .topbar-tab--interactive:hover {
      transform: translateY(-2px);
    }
  `],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnaireTopbarComponent {
  protected readonly declaration = inject(HealthDeclarationFormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  protected readonly showScrollIndicator = signal(false);
  protected readonly scrollThumbWidth = signal(0);
  protected readonly scrollThumbOffset = signal(0);
  private metricsFrame = 0;

  protected readonly personTabs = computed<PersonTab[]>(() => {
    this.declaration.peopleVersion();
    this.declaration.currentPersonIndex();
    this.declaration.highestReachedPersonIndex();
    this.declaration.reviewMode();

    return this.declaration.peopleArray.controls.map((person, index) => ({
      id: this.declaration.personId(person),
      index,
      label: person.controls.birthYear.value.trim() || 'Year',
      state: this.declaration.personStepStatus(index),
      canOpen: this.declaration.canVisitPerson(index),
      completed: this.declaration.isPersonCompleted(index),
      avatarSrc: this.declaration.avatarSrc(person),
    }));
  });

  protected readonly tabLayout = computed(() => {
    const tabCount = this.personTabs().length;

    return {
      hideNativeOverflow: tabCount <= 4,
      gridColumns: tabCount >= 2 && tabCount <= 4 ? tabCount : 0,
      centered: tabCount === 1,
      scrollable: tabCount > 4,
      compactCard: tabCount <= 4,
    };
  });

  protected visitPerson(index: number): void {
    this.declaration.visitPerson(index);
    this.scheduleScrollMetricsUpdate();
  }

  protected updateScrollMetrics(): void {
    this.scheduleScrollMetricsUpdate();
  }

  protected topbarTabClass(tab: PersonTab, layout: ReturnType<QuestionnaireTopbarComponent['tabLayout']>): string {
    const base =
      'topbar__tab relative flex min-w-0 flex-col items-center gap-1 rounded-[0.95rem] border-0 bg-transparent px-2 pt-1.5 text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale';
    const sizing = `${layout.gridColumns > 0 ? 'w-full max-w-[5.9rem] justify-self-center' : layout.compactCard ? 'w-[5.9rem]' : ''} ${layout.scrollable ? 'min-w-[7rem]' : ''}`;
    const interaction = tab.canOpen && tab.state !== 'active' ? 'topbar-tab--interactive' : '';
    return `${base} ${sizing} ${interaction}`;
  }

  protected topbarLabelClass(tab: PersonTab): string {
    const weight = tab.state === 'active' ? 'font-normal text-slate-950' : tab.canOpen ? 'font-normal text-slate-500' : 'font-normal text-slate-400';
    return `topbar__label max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] leading-none ${weight}`;
  }

  protected topbarAvatarClass(tab: PersonTab): string {
    const active = tab.state === 'active' ? 'scale-100' : '';
    const enabled = tab.canOpen ? 'opacity-95' : '';
    return `topbar__avatar flex h-[3.85rem] w-[3.85rem] items-end justify-center overflow-hidden rounded-[1.1rem] transition-transform duration-200 ${active} ${enabled}`;
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelScheduledMetrics());

    effect(() => {
      this.personTabs();
      this.tabLayout();
      this.declaration.currentPersonIndex();
      this.scheduleScrollMetricsUpdate();
    });

    effect((onCleanup) => {
      const container = this.scrollContainer()?.nativeElement;
      if (!container || typeof ResizeObserver === 'undefined') {
        this.scheduleScrollMetricsUpdate();
        return;
      }

      const observer = new ResizeObserver(() => this.scheduleScrollMetricsUpdate());
      observer.observe(container);
      const tabs = container.firstElementChild;
      if (tabs) {
        observer.observe(tabs);
      }
      this.scheduleScrollMetricsUpdate();
      onCleanup(() => observer.disconnect());
    });
  }

  private scheduleScrollMetricsUpdate(): void {
    this.cancelScheduledMetrics();

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0);

    this.metricsFrame = schedule(() => {
      this.metricsFrame = 0;
      this.readScrollMetrics();
    });
  }

  private cancelScheduledMetrics(): void {
    if (!this.metricsFrame) {
      return;
    }

    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.metricsFrame);
    } else {
      clearTimeout(this.metricsFrame);
    }
    this.metricsFrame = 0;
  }

  private readScrollMetrics(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) {
      this.showScrollIndicator.set(false);
      this.scrollThumbWidth.set(0);
      this.scrollThumbOffset.set(0);
      return;
    }

    const visibleWidth = container.clientWidth;
    const totalWidth = container.scrollWidth;
    const scrollableWidth = totalWidth - visibleWidth;
    const hasOverflow = scrollableWidth > 1;
    this.showScrollIndicator.set(hasOverflow);

    if (!hasOverflow || visibleWidth === 0) {
      this.scrollThumbWidth.set(0);
      this.scrollThumbOffset.set(0);
      return;
    }

    const thumbWidth = Math.max(visibleWidth * (visibleWidth / totalWidth), 36);
    const maxOffset = Math.max(visibleWidth - thumbWidth, 0);
    this.scrollThumbWidth.set(thumbWidth);
    this.scrollThumbOffset.set((container.scrollLeft / scrollableWidth) * maxOffset);
  }
}
