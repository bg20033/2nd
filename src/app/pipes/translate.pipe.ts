import { ChangeDetectorRef, effect, inject, Pipe, PipeTransform } from '@angular/core';

import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.i18n.language();
      this.i18n.dictionaryVersion();
      this.cdr.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.i18n.translate(key, params);
  }
}
