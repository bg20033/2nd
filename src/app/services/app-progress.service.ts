import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { HealthDeclarationFormService } from './health-declaration-form.service';

@Injectable({ providedIn: 'root' })
export class AppProgressService {
  private readonly router = inject(Router);
  private readonly declaration = inject(HealthDeclarationFormService);
  private readonly currentUrl = signal(this.router.url);

  readonly percent = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];

    if (url === '/' || url.startsWith('/landing')) {
      return 5;
    }

    if (url.startsWith('/family')) {
      return 10;
    }

    if (url.startsWith('/review')) {
      return 100;
    }

    if (url.startsWith('/questions')) {
      return Math.round(10 + this.declaration.overallQuestionnaireProgress() * 90);
    }

    return 5;
  });

  readonly label = computed(() => `${this.percent()}%`);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
