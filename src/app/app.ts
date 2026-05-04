import { Component, signal } from '@angular/core';
import { AppLanding } from './components/pages/app-landing/app-landing';
import { FamilyConfig } from './components/pages/family-config/family-config';
import { QuestionnaireFormComponent } from './components/pages/questions/page/questionnaire-form.component';

type AppStep = 'landing' | 'family' | 'questions';

@Component({
  selector: 'app-root',
  imports: [AppLanding, FamilyConfig, QuestionnaireFormComponent],
  template: `
    @switch (step()) {
      @case ('questions') {
        <app-questionnaire-form (back)="openFamilyConfig()" (completed)="openLanding()" />
      }
      @case ('family') {
        <app-family-config (back)="openLanding()" (next)="openQuestionnaire()" />
      }
      @default {
        <app-landing (start)="openFamilyConfig()" />
      }
    }
  `,
})
export class App {
  protected readonly step = signal<AppStep>('landing');

  protected openFamilyConfig(): void {
    this.step.set('family');
  }

  protected openLanding(): void {
    this.step.set('landing');
  }

  protected openQuestionnaire(): void {
    this.step.set('questions');
  }
}
