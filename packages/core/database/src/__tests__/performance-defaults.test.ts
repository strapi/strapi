import { DEFAULT_DATABASE_PERFORMANCE_CONFIG } from '../performance';

describe('database performance defaults (SQL monitoring spec)', () => {
  it('uses safe production-minded defaults', () => {
    expect(DEFAULT_DATABASE_PERFORMANCE_CONFIG.enabled).toBe(false);
    expect(DEFAULT_DATABASE_PERFORMANCE_CONFIG.slowQueryMs).toBe(100);
    expect(DEFAULT_DATABASE_PERFORMANCE_CONFIG.sampleRate).toBe(1);
    expect(DEFAULT_DATABASE_PERFORMANCE_CONFIG.captureSqlText).toBe(false);
    expect(DEFAULT_DATABASE_PERFORMANCE_CONFIG.captureBindings).toBe(false);
  });
});
