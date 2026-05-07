import { Injectable, InjectionToken, inject } from '@angular/core';

import { HealthDeclarationFormService } from './health-declaration-form.service';
import type {
  ReviewDashboard,
  ReviewPersonScope,
} from './health-declaration-report.types';

export const GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL = new InjectionToken<string>(
  'GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL',
  {
    providedIn: 'root',
    factory: () => '',
  },
);

export const GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL = new InjectionToken<string>(
  'GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL',
  {
    providedIn: 'root',
    factory: () => '',
  },
);

export type HealthDeclarationReportPayload = ReviewDashboard & {
  reportToken: string;
  reportUrl: string;
  submittedAt: string;
};

type JsonpCallback = (value: HealthDeclarationReportPayload | ReviewDashboard | null) => void;

const REPORT_STORAGE_PREFIX = 'healthDeclarationReport:';
const REPORT_LOOKUP_TIMEOUT_MS = 18000;
const REPORT_LOOKUP_RETRY_MS = 900;

@Injectable({ providedIn: 'root' })
export class HealthDeclarationReportService {
  private readonly declaration = inject(HealthDeclarationFormService);
  private readonly webhookUrl = inject(GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL);
  private readonly lookupUrl = inject(GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL);

  buildReportPayload(
    recipientEmail: string,
    scope: ReviewPersonScope,
    origin = globalThis.location?.origin ?? '',
  ): HealthDeclarationReportPayload {
    const reportToken = this.createReportToken();
    const dashboard = this.declaration.reviewDashboard(scope, recipientEmail);
    const reportUrl = `${origin}/report/${encodeURIComponent(reportToken)}`;

    return {
      ...dashboard,
      reportToken,
      reportUrl,
      submittedAt: dashboard.generatedAt,
    };
  }

  async sendReportEmail(recipientEmail: string, scope: ReviewPersonScope): Promise<HealthDeclarationReportPayload> {
    if (!this.webhookUrl.trim()) {
      throw new Error('GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL is not configured.');
    }

    const payload = this.buildReportPayload(recipientEmail, scope);
    if (payload.people.length === 0) {
      throw new Error('Report has no people.');
    }

    await this.postToAppsScript(payload);
    this.storeReportPayload(payload);
    await this.verifyRemoteReport(payload.reportToken);
    return payload;
  }

  reportForToken(token: string | null | undefined): ReviewDashboard | null {
    if (!token) {
      return null;
    }

    const payload = this.readReportPayload(token);
    if (!payload) {
      return null;
    }

    return this.payloadToDashboard(payload);
  }

  async fetchReportForToken(token: string | null | undefined): Promise<ReviewDashboard | null> {
    const stored = this.reportForToken(token);
    if (stored || !token || !this.lookupEndpointUrl()) {
      return stored;
    }

    try {
      const payload = await this.fetchJsonpReport(token);
      return this.normalizeFetchedReport(payload, token);
    } catch {
      return null;
    }
  }

  private storeReportPayload(payload: HealthDeclarationReportPayload): void {
    const json = JSON.stringify(payload);

    try {
      localStorage.setItem(`${REPORT_STORAGE_PREFIX}${payload.reportToken}`, json);
    } catch {
      // Local storage can be unavailable in private browsing or tests.
    }

    try {
      sessionStorage.setItem(`${REPORT_STORAGE_PREFIX}${payload.reportToken}`, json);
    } catch {
      // Session storage can be unavailable in private browsing or tests.
    }
  }

  private readReportPayload(token: string): HealthDeclarationReportPayload | null {
    const key = `${REPORT_STORAGE_PREFIX}${token}`;

    const localPayload = this.readStoredPayload(localStorage, key, token);
    if (localPayload) {
      return localPayload;
    }

    return this.readStoredPayload(sessionStorage, key, token);
  }

  private readStoredPayload(storage: Storage, key: string, token: string): HealthDeclarationReportPayload | null {
    try {
      const stored = storage.getItem(key);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as HealthDeclarationReportPayload;
      return parsed?.reportToken === token ? parsed : null;
    } catch {
      return null;
    }
  }

  private async verifyRemoteReport(token: string): Promise<void> {
    if (!this.lookupEndpointUrl()) {
      return;
    }

    const deadline = Date.now() + REPORT_LOOKUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const payload = await this.fetchJsonpReport(token);
        if (this.normalizeFetchedReport(payload, token)) {
          return;
        }
      } catch {
        // Apps Script can be briefly unavailable while the POST is still being processed.
      }
      await this.delay(REPORT_LOOKUP_RETRY_MS);
    }

    throw new Error('Report was not stored by Google Apps Script.');
  }

  private async postToAppsScript(payload: HealthDeclarationReportPayload): Promise<void> {
    await fetch(this.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  }

  private fetchJsonpReport(token: string): Promise<HealthDeclarationReportPayload | ReviewDashboard | null> {
    const callbackName = `healthDeclarationReport_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(this.lookupEndpoint(token));
    url.searchParams.set('callback', callbackName);

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Report lookup timed out.'));
      }, 12000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        script.remove();
        delete (globalThis as typeof globalThis & Record<string, unknown>)[callbackName];
      };

      (globalThis as typeof globalThis & Record<string, JsonpCallback>)[callbackName] = (value) => {
        cleanup();
        resolve(value);
      };

      script.async = true;
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error('Report lookup failed.'));
      };
      document.head.append(script);
    });
  }

  private lookupEndpoint(token: string): string {
    const encodedToken = encodeURIComponent(token);
    const url = this.lookupEndpointUrl();
    if (!url) {
      throw new Error('GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL is not configured.');
    }

    if (url.includes(':token')) {
      return url.replace(':token', encodedToken);
    }

    const endpoint = new URL(url);
    endpoint.searchParams.set('token', token);
    return endpoint.toString();
  }

  private lookupEndpointUrl(): string {
    return this.lookupUrl.trim() || this.webhookUrl.trim();
  }

  private normalizeFetchedReport(
    value: HealthDeclarationReportPayload | ReviewDashboard | null,
    token: string,
  ): ReviewDashboard | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const payload = value as Partial<HealthDeclarationReportPayload>;
    if (payload.reportToken) {
      if (payload.reportToken !== token) {
        return null;
      }
      this.storeReportPayload(payload as HealthDeclarationReportPayload);
      return this.payloadToDashboard(payload as HealthDeclarationReportPayload);
    }

    return value as ReviewDashboard;
  }

  private payloadToDashboard(payload: HealthDeclarationReportPayload): ReviewDashboard {
    const { reportToken: _reportToken, reportUrl: _reportUrl, submittedAt: _submittedAt, ...dashboard } = payload;
    return dashboard;
  }

  private createReportToken(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) {
      return uuid;
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, durationMs));
  }
}
