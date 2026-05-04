import { Component, Directive, computed, effect, input, signal } from '@angular/core';

import { YesNoToggleComponent } from '../../../form-controls';
import { DiagnosisPanelComponent } from '../diagnosis/diagnosis-entry.component';
import { DiagnosisQuestionId, YesNoControl } from '../questionnaire.types';
import { QuestionnaireFormService } from '../questionnaire-form.service';

@Component({
  selector: 'app-question-card-shell',
  standalone: true,
  templateUrl: './question-card-shell.component.html',
  host: { class: 'block' },
})
export class QuestionCardShellComponent {
  number = input('');
  title = input.required<string>();
  description = input('');
  disabled = input(false);
}

@Directive()
export abstract class YesNoQuestionCardBase {
  control = input.required<YesNoControl>();
  number = input.required<string>();
  title = input.required<string>();
  description = input('');
  disabled = input(false);

  private readonly stateVersion = signal(0);

  isYes = computed(() => {
    this.stateVersion();
    return this.control().value?.value === true;
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() => {
        this.stateVersion.update((version) => version + 1);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
}

@Component({
  selector: 'app-binary-question-card',
  standalone: true,
  imports: [YesNoToggleComponent, QuestionCardShellComponent],
  template: `
    <app-question-card-shell
      [number]="number()"
      [title]="title()"
      [description]="description()"
      [disabled]="disabled()"
    >
      <app-yes-no-toggle [control]="control()" label="" />

      @if (isYes()) {
        <div class="grid gap-4">
          <ng-content />
        </div>
      }
    </app-question-card-shell>
  `,
})
export class BinaryQuestionCardComponent extends YesNoQuestionCardBase {}

@Component({
  selector: 'app-diagnosis-question-card',
  standalone: true,
  imports: [YesNoToggleComponent, DiagnosisPanelComponent, QuestionCardShellComponent],
  template: `
    <app-question-card-shell
      [number]="number()"
      [title]="title()"
      [description]="description()"
      [disabled]="disabled()"
    >
      <app-yes-no-toggle [control]="control()" label="" />

      @if (isYes() && !disabled()) {
        <div class="grid gap-4">
          <ng-content />
          <app-diagnosis-panel
            [formService]="formService()"
            [questionId]="questionId()"
            [disabled]="disabled()"
          />
        </div>
      }
    </app-question-card-shell>
  `,
})
export class DiagnosisQuestionCardComponent extends YesNoQuestionCardBase {
  formService = input.required<QuestionnaireFormService>();
  questionId = input.required<DiagnosisQuestionId>();
}
