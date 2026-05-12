import { readFileSync, writeFileSync } from 'node:fs';

const envPath = '.env';
const outputPath = 'src/app/app-env.ts';

const env = {
  GOOGLE_APPS_SCRIPT_REPORT_WEBHOOK_URL: '',
  GOOGLE_APPS_SCRIPT_REPORT_LOOKUP_URL: '',
};

function parseEnv(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key in env) {
      env[key] = value;
    }
  }
}

try {
  parseEnv(readFileSync(envPath, 'utf8'));
} catch {
  // Missing .env is allowed; Angular receives empty defaults.
}

writeFileSync(outputPath, `export const appEnv = ${JSON.stringify(env, null, 2)} as const;\n`);
