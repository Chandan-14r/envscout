export function makeClientConfig() {
  return {
    apiBaseUrl: process.env.API_BASE_URL ?? "https://api.example.test",
    apiKey: process.env.API_KEY,
    telemetryDsn: process.env.SENTRY_DSN
  };
}

