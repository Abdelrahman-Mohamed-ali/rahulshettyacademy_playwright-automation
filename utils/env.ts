/**
 * Centralized, safe access to environment variables.
 * Credentials are never logged or returned in error messages.
 */

export interface TestCredentials {
  username: string;
  password: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env for local runs or as a GitHub Secret for CI.`
    );
  }
  return value.trim();
}

export function getCredentials(): TestCredentials {
  return {
    username: requireEnv('TEST_USERNAME'),
    password: requireEnv('TEST_PASSWORD'),
  };
}

export function getBaseUrl(): string {
  return process.env.BASE_URL?.trim() || 'https://rahulshettyacademy.com/client';
}
