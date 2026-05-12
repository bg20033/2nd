import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { appRoutes } from './app.routes';
import { appEnv } from './app-env';
import {
  GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL,
  GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL,
} from './services/health-declaration-report.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(appRoutes),
    {
      provide: GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL,
      useValue: appEnv.GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL,
    },
    {
      provide: GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL,
      useValue: appEnv.GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL,
    },
  ],
};
