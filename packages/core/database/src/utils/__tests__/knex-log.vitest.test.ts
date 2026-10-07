import { describe, expect, it, vi } from 'vitest';

import { createKnexWarn, withStrapiKnexLog } from '../knex-log';

const ACQUIRE = 'Acquire connection error: TimeoutError: operation timed out for an unknown reason';

describe('createKnexWarn', () => {
  it('prefixes knex warnings and passes them through', () => {
    const logger = { warn: vi.fn() };
    const warn = createKnexWarn(logger);

    warn('Pool config option "ping" is no longer supported.');

    expect(logger.warn).toHaveBeenCalledWith(
      '[database] knex: Pool config option "ping" is no longer supported.'
    );
  });

  it('logs the first acquire error, then at most one per interval with the count it held back', () => {
    let clock = 0;
    const logger = { warn: vi.fn() };
    const warn = createKnexWarn(logger, { intervalMs: 30_000, now: () => clock });

    warn(ACQUIRE);
    clock = 1_000;
    warn(ACQUIRE);
    warn(ACQUIRE);
    clock = 30_000;
    warn(ACQUIRE);

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn.mock.calls[0][0]).toBe(`[database] knex: ${ACQUIRE}`);
    expect(logger.warn.mock.calls[1][0]).toBe(
      `[database] knex: ${ACQUIRE}\n  - similar knex warnings not logged since the previous one: 2`
    );
  });

  it('does not throttle other warnings', () => {
    const logger = { warn: vi.fn() };
    const warn = createKnexWarn(logger, { now: () => 0 });

    warn('first');
    warn('second');

    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});

describe('withStrapiKnexLog', () => {
  it('adds a warn function routed to the logger', () => {
    const logger = { warn: vi.fn() };
    const config = withStrapiKnexLog({ client: 'pg' }, logger);

    config.log?.warn?.('hello');

    expect(logger.warn).toHaveBeenCalledWith('[database] knex: hello');
  });

  it('keeps a warn function configured by the project', () => {
    const projectWarn = vi.fn();
    const config = withStrapiKnexLog(
      { client: 'pg', log: { warn: projectWarn } },
      { warn: vi.fn() }
    );

    expect(config.log?.warn).toBe(projectWarn);
  });

  it("keeps the project's other log options", () => {
    const projectError = vi.fn();
    const config = withStrapiKnexLog(
      { client: 'pg', log: { error: projectError, enableColors: false } },
      { warn: vi.fn() }
    );

    expect(config.log?.error).toBe(projectError);
    expect(config.log?.enableColors).toBe(false);
    expect(typeof config.log?.warn).toBe('function');
  });

  it('does not change the config object it is given', () => {
    const original = { client: 'pg' };

    withStrapiKnexLog(original, { warn: vi.fn() });

    expect(original).toEqual({ client: 'pg' });
  });
});
