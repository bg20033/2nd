import { Component, signal } from '@angular/core';
import { AppLanding } from './components/pages/app-landing/app-landing';
import { FamilyConfig } from './components/pages/family-config/family-config';
import { QuestionnaireFormComponent } from './components/pages/questions/page/questionnaire-form.component';

type AppStep = 'landing' | 'family' | 'questions';

@Component({
  selector: 'app-root',
  imports: [AppLanding, FamilyConfig, QuestionnaireFormComponent],
  templateUrl: './app.html',
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
