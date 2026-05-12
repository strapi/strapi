describe('cli-opentelemetry env gate', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
    jest.resetModules();
  });

  it('is disabled when STRAPI_OTEL_ENABLED is unset', async () => {
    delete process.env.STRAPI_OTEL_ENABLED;
    const { isCliOpenTelemetryEnabled } = await import('../cli-opentelemetry');
    expect(isCliOpenTelemetryEnabled()).toBe(false);
  });

  it('is enabled when STRAPI_OTEL_ENABLED is true', async () => {
    process.env.STRAPI_OTEL_ENABLED = 'true';
    process.env.STRAPI_OTEL_HTTP_ENDPOINT = 'http://127.0.0.1:4318';
    const { isCliOpenTelemetryEnabled } = await import('../cli-opentelemetry');
    expect(isCliOpenTelemetryEnabled()).toBe(true);
  });
});
