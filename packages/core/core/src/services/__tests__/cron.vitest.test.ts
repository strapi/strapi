import Module from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import createCronService from '../cron';

const FIXED_NOW = new Date('2026-09-14T12:34:56.000Z');
const NEXT_MINUTE = new Date('2026-09-14T12:35:00.000Z');

type CronJob = ReturnType<typeof createCronService>['jobs'][number]['job'];

const advanceToNextRun = async (job: CronJob) => {
  const nextRun = job.nextRun();
  if (!nextRun) {
    throw new Error('Expected the cron job to have a next run');
  }

  await vi.advanceTimersByTimeAsync(nextRun.getTime() - Date.now());
};

describe('Cron service', () => {
  let cron: ReturnType<typeof createCronService>;

  beforeEach(() => {
    vi.useFakeTimers({ now: FIXED_NOW });

    global.strapi = {
      log: {
        error: vi.fn(),
      },
    } as any;

    cron = createCronService();
  });

  afterEach(() => {
    cron.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('exposes chainable lifecycle methods and named and unnamed job specs', () => {
    const namedOptions = '0 0 * * *';
    const unnamedOptions = '0 0 0 * * *';

    expect(
      cron.add({
        namedJob: {
          task: vi.fn(),
          options: namedOptions,
        },
        [unnamedOptions]: vi.fn(),
      })
    ).toBe(cron);

    expect(cron.jobs).toHaveLength(2);
    expect(cron.jobs[0]).toEqual({
      job: expect.any(Object),
      name: 'namedJob',
      options: namedOptions,
    });
    expect(cron.jobs[1]).toEqual({
      job: expect.any(Object),
      name: null,
      options: unnamedOptions,
    });
    expect(cron.start()).toBe(cron);
    expect(cron.stop()).toBe(cron);
    expect(cron.remove('namedJob')).toBe(cron);
    expect(cron.destroy()).toBe(cron);
    expect(cron.jobs).toEqual([]);
  });

  it('does not load croner until the first task is added', async () => {
    // croner is loaded through a lazy `require()`, which Vitest's module mocking does not
    // intercept, so observe the CommonJS loader directly.
    const requireSpy = vi.spyOn(Module.prototype, 'require');
    const cronerRequires = () => requireSpy.mock.calls.filter(([id]) => id === 'croner').length;

    vi.resetModules();
    const { default: createIsolatedCronService } = await import('../cron');
    const isolatedCron = createIsolatedCronService();

    expect(cronerRequires()).toBe(0);

    isolatedCron.add({ '0 0 * * *': vi.fn() });

    expect(cronerRequires()).toBe(1);
    isolatedCron.destroy();
    requireSpy.mockRestore();
  });

  it('schedules a slightly-future Date exactly once after start', async () => {
    const task = vi.fn();

    cron.start();
    cron.add({
      publishOnce: {
        task,
        options: NEXT_MINUTE,
      },
    });

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].name).toBe('publishOnce');

    await advanceToNextRun(cron.jobs[0].job);

    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith({ strapi: global.strapi }, expect.any(Date));
    expect(task.mock.calls[0][1]).toEqual(NEXT_MINUTE);
    await vi.runOnlyPendingTimersAsync();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does not run jobs added while stopped until start', async () => {
    const task = vi.fn();

    cron.add({
      '*/1 * * * * *': task,
    });

    await vi.runOnlyPendingTimersAsync();
    expect(task).not.toHaveBeenCalled();

    cron.start();
    await advanceToNextRun(cron.jobs[0].job);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('runs jobs added after start', async () => {
    const task = vi.fn();

    cron.start();
    cron.add({
      runAfterStart: {
        task,
        options: NEXT_MINUTE,
      },
    });

    await advanceToNextRun(cron.jobs[0].job);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a one-shot twice across stop and start cycles', async () => {
    const task = vi.fn();

    cron.add({
      runOnce: {
        task,
        options: NEXT_MINUTE,
      },
    });

    cron.start();
    cron.stop();
    cron.start();

    await advanceToNextRun(cron.jobs[0].job);
    expect(task).toHaveBeenCalledTimes(1);

    cron.stop();
    cron.start();

    await vi.runOnlyPendingTimersAsync();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('keeps a past Date job without running or throwing', async () => {
    const task = vi.fn();

    cron.start();

    expect(() =>
      cron.add({
        missedOneShot: {
          task,
          options: new Date(Date.now() - 1000),
        },
      })
    ).not.toThrow();

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].job.nextRun()).toBeNull();

    await vi.runOnlyPendingTimersAsync();
    expect(task).not.toHaveBeenCalled();
  });

  it('remove stops a named job', async () => {
    const task = vi.fn();

    cron.start();
    cron.add({
      namedJob: {
        task,
        options: '*/1 * * * * *',
      },
    });

    const { job } = cron.jobs[0];
    cron.remove('namedJob');

    expect(cron.jobs).toHaveLength(0);
    expect(job.isStopped()).toBe(true);

    await vi.runOnlyPendingTimersAsync();
    expect(task).not.toHaveBeenCalled();
  });

  it('remove ignores an unknown name', () => {
    cron.add({
      existingJob: {
        task: vi.fn(),
        options: '0 0 * * *',
      },
    });

    expect(() => cron.remove('unknownJob')).not.toThrow();
    expect(cron.jobs).toHaveLength(1);
  });

  it('allows duplicate façade names without throwing', () => {
    const firstSchedule = new Date(Date.now() + 60_000);
    const replacementSchedule = new Date(Date.now() + 120_000);

    expect(() => {
      cron.add({
        publishRelease: {
          task: vi.fn(),
          options: firstSchedule,
        },
      });
      cron.add({
        publishRelease: {
          task: vi.fn(),
          options: replacementSchedule,
        },
      });
    }).not.toThrow();

    expect(cron.jobs).toHaveLength(2);
  });

  it('remove drops every job with the given name', () => {
    cron.add({
      publishRelease: {
        task: vi.fn(),
        options: new Date(Date.now() + 60_000),
      },
    });
    cron.add({
      publishRelease: {
        task: vi.fn(),
        options: new Date(Date.now() + 120_000),
      },
    });

    cron.remove('publishRelease');

    expect(cron.jobs).toHaveLength(0);
  });

  it('destroy clears jobs and prevents further runs', async () => {
    const task = vi.fn();

    cron.start();
    cron.add({
      namedJob: {
        task,
        options: '*/1 * * * * *',
      },
    });

    const { job } = cron.jobs[0];
    cron.destroy();

    expect(cron.jobs).toHaveLength(0);
    expect(job.isStopped()).toBe(true);

    await vi.runOnlyPendingTimersAsync();
    expect(task).not.toHaveBeenCalled();
  });

  it('logs errors thrown by job handlers', async () => {
    cron.add({
      boom: {
        async task() {
          throw new Error('cron-boom');
        },
        options: '0 0 1 1 *',
      },
    });

    await cron.jobs[0].job.trigger();

    expect(global.strapi.log.error).toHaveBeenCalledWith(
      'Cron job "boom" failed',
      expect.any(Error)
    );
  });

  it('accepts 5-field and 6-field cron strings', () => {
    cron.start();
    cron.add({
      fiveField: {
        task: vi.fn(),
        options: '0 0 * * *',
      },
      sixField: {
        task: vi.fn(),
        options: '0 0 0 * * *',
      },
    });

    expect(cron.jobs).toHaveLength(2);
    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
    expect(cron.jobs[1].job.nextRun()).toBeInstanceOf(Date);
  });

  it('accepts numeric-prefix stepping from cron-parser', () => {
    cron.add({
      stepped: {
        task: vi.fn(),
        options: '0 5/15 * * * *',
      },
    });

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
    expect(global.strapi.log.error).not.toHaveBeenCalled();
  });

  it.each([
    ['Sunday as 0', '0 0 * * 0'],
    ['Sunday as 7', '0 0 * * 7'],
  ])('accepts %s', (_title, options) => {
    expect(() =>
      cron.add({
        sundayJob: {
          task: vi.fn(),
          options,
        },
      })
    ).not.toThrow();

    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
  });

  it('accepts { rule, tz, start, end } object schedules', () => {
    cron.start();

    expect(() =>
      cron.add({
        objectSchedule: {
          task: vi.fn(),
          options: {
            rule: '0 0 * * *',
            start: new Date(Date.now() + 1000),
            end: Date.now() + 86_400_000,
            tz: 'UTC',
          },
        },
      })
    ).not.toThrow();

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
  });

  it('accepts node-schedule recurrence objects and string start/end', () => {
    cron.start();

    cron.add({
      objLit: {
        task: vi.fn(),
        options: { dayOfWeek: 1, hour: 1, minute: 0, tz: 'UTC' },
      },
      recurrenceRuleShaped: {
        task: vi.fn(),
        options: {
          recurs: true,
          dayOfWeek: 1,
          hour: 1,
          minute: 0,
          second: 0,
          tz: 'UTC',
        },
      },
      stringWindow: {
        task: vi.fn(),
        options: {
          rule: '0 0 * * *',
          start: '2027-06-01T00:00:00.000Z',
          end: '2027-06-15T00:00:00.000Z',
        },
      },
    });

    expect(cron.jobs).toHaveLength(3);
    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
    expect(cron.jobs[1].job.nextRun()).toBeInstanceOf(Date);
    expect(cron.jobs[2].job.nextRun()).toBeInstanceOf(Date);
    expect(global.strapi.log.error).not.toHaveBeenCalled();
  });

  it('maps recurrence month ranges, arrays, and years to Croner fields', () => {
    cron.add({
      range: {
        task: vi.fn(),
        options: {
          date: 1,
          hour: 0,
          minute: 0,
          month: { start: 0, end: 2, step: 2 },
          year: 2027,
          tz: 'UTC',
        },
      },
      array: {
        task: vi.fn(),
        options: {
          date: 1,
          hour: 0,
          minute: 0,
          month: [0, 1],
          year: 2027,
          tz: 'UTC',
        },
      },
    });

    expect(cron.jobs).toHaveLength(2);
    expect(cron.jobs[0].job.nextRun(new Date('2026-12-31T00:00:00.000Z'))).toEqual(
      new Date('2027-01-01T00:00:00.000Z')
    );
    expect(cron.jobs[1].job.nextRun(new Date('2027-01-15T00:00:00.000Z'))).toEqual(
      new Date('2027-02-01T00:00:00.000Z')
    );
    expect(global.strapi.log.error).not.toHaveBeenCalled();
  });

  it('accepts Date and timestamp values nested in rule options', () => {
    const date = new Date(Date.now() + 60_000);
    const timestamp = Date.now() + 120_000;

    cron.add({
      dateRule: { task: vi.fn(), options: { rule: date } },
      timestampRule: { task: vi.fn(), options: { rule: timestamp } },
    });

    expect(cron.jobs).toHaveLength(2);
    expect(cron.jobs[0].job.getOnce()).toEqual(date);
    expect(cron.jobs[1].job.getOnce()).toEqual(new Date(timestamp));
  });

  it('exposes node-schedule job aliases and rejects from invoke()', async () => {
    cron.start();
    cron.add({
      boom: {
        async task() {
          throw new Error('cron-boom');
        },
        options: new Date(Date.now() + 60_000),
      },
    });

    const { job } = cron.jobs[0];
    expect(typeof job.invoke).toBe('function');
    expect(typeof job.cancel).toBe('function');
    expect(typeof job.nextInvocation).toBe('function');
    expect(typeof job.reschedule).toBe('function');
    expect(job.nextInvocation()).toBeInstanceOf(Date);

    await expect(job.invoke()).rejects.toThrow('cron-boom');
  });

  it('cancel stops the current schedule', async () => {
    const task = vi.fn();
    cron.start();
    cron.add({
      cancelMe: {
        task,
        options: NEXT_MINUTE,
      },
    });

    const { job } = cron.jobs[0];

    expect(job.cancel()).toBe(true);
    expect(job.isStopped()).toBe(true);

    await vi.runOnlyPendingTimersAsync();
    expect(task).not.toHaveBeenCalled();
  });

  it('reschedule preserves the handle and keeps the old schedule on failure', () => {
    cron.start();
    cron.add({
      first: {
        task: vi.fn(),
        options: '0 0 * * *',
      },
      second: {
        task: vi.fn(),
        options: new Date(Date.now() + 60_000),
      },
    });

    cron.remove('first');
    const handle = cron.jobs[0].job;
    const originalNextRun = handle.nextInvocation();

    expect(handle.reschedule('not a cron expression')).toBe(false);
    expect(handle.nextInvocation()).toEqual(originalNextRun);
    expect(handle.isStopped()).toBe(false);

    const later = new Date(Date.now() + 120_000);
    expect(handle.reschedule(later)).toBe(true);
    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].job).toBe(handle);
    expect(cron.jobs[0].options).toEqual(later);
    expect(handle.nextInvocation()).toEqual(later);

    const latest = new Date(Date.now() + 180_000);
    expect(handle.reschedule(latest)).toBe(true);
    expect(handle.nextInvocation()).toEqual(latest);
  });

  it('does not reschedule a handle removed from the service', () => {
    cron.add({
      removeMe: {
        task: vi.fn(),
        options: new Date(Date.now() + 60_000),
      },
    });

    const handle = cron.jobs[0].job;
    cron.remove('removeMe');

    expect(handle.reschedule(new Date(Date.now() + 120_000))).toBe(false);
  });

  it('rejects request as a task function property', () => {
    expect(() =>
      cron.add({
        invalidTaskObject: {
          request: vi.fn(),
          options: '0 0 * * *',
        },
      } as never)
    ).toThrow('Could not schedule a cron job for "invalidTaskObject": no function found.');
  });

  it('keeps valid jobs when a later schedule in the same add() is invalid', () => {
    expect(() =>
      cron.add({
        goodJob: {
          task: vi.fn(),
          options: '0 0 * * *',
        },
        badJob: {
          task: vi.fn(),
          options: 'not a cron expression',
        },
      })
    ).not.toThrow();

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].name).toBe('goodJob');
  });

  it('reschedules a named Date job when the caller removes first then adds', async () => {
    const first = vi.fn();
    const second = vi.fn();

    cron.start();
    cron.add({
      publishRelease_1: {
        task: first,
        options: NEXT_MINUTE,
      },
    });
    cron.remove('publishRelease_1');
    cron.add({
      publishRelease_1: {
        task: second,
        options: NEXT_MINUTE,
      },
    });

    expect(cron.jobs).toHaveLength(1);
    await advanceToNextRun(cron.jobs[0].job);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
