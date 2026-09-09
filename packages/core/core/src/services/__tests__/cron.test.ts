import createCronService from '../cron';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const waitFor = async (condition: () => boolean, timeout = 3000) => {
  const deadline = Date.now() + timeout;
  while (!condition() && Date.now() < deadline) {
    await sleep(25);
  }
};

describe('Cron service', () => {
  let cron: ReturnType<typeof createCronService>;

  beforeEach(() => {
    global.strapi = {
      log: {
        error: jest.fn(),
      },
    } as any;

    cron = createCronService();
  });

  afterEach(() => {
    cron.destroy();
  });

  it('exposes chainable lifecycle methods and named and unnamed job specs', () => {
    const namedOptions = '0 0 * * *';
    const unnamedOptions = '0 0 0 * * *';

    expect(
      cron.add({
        namedJob: {
          task: jest.fn(),
          options: namedOptions,
        },
        [unnamedOptions]: jest.fn(),
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

  it('does not load croner until the first task is added', () => {
    jest.resetModules();

    const loadCroner = jest.fn(() => {
      class Cron {
        pause = jest.fn();

        resume = jest.fn();

        stop = jest.fn();
      }

      return { Cron };
    });

    jest.doMock('croner', loadCroner);

    jest.isolateModules(() => {
      const createIsolatedCronService =
        jest.requireActual<typeof import('../cron')>('../cron').default;
      const isolatedCron = createIsolatedCronService();

      expect(loadCroner).not.toHaveBeenCalled();

      isolatedCron.add({ '0 0 * * *': jest.fn() });

      expect(loadCroner).toHaveBeenCalledTimes(1);
      isolatedCron.destroy();
    });

    jest.dontMock('croner');
  });

  it('schedules a slightly-future Date exactly once after start', async () => {
    const task = jest.fn();
    const scheduledAt = new Date(Date.now() + 150);

    cron.start();
    cron.add({
      publishOnce: {
        task,
        options: scheduledAt,
      },
    });

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].name).toBe('publishOnce');

    await waitFor(() => task.mock.calls.length === 1);

    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith({ strapi: global.strapi }, expect.any(Date));
    expect(task.mock.calls[0][1]).toEqual(scheduledAt);

    await sleep(200);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does not run jobs added while stopped until start', async () => {
    const task = jest.fn();

    cron.add({
      '*/1 * * * * *': task,
    });

    await sleep(1100);
    expect(task).not.toHaveBeenCalled();

    cron.start();
    await waitFor(() => task.mock.calls.length > 0);

    expect(task).toHaveBeenCalled();
  });

  it('runs jobs added after start', async () => {
    const task = jest.fn();

    cron.start();
    cron.add({
      runAfterStart: {
        task,
        options: new Date(Date.now() + 100),
      },
    });

    await waitFor(() => task.mock.calls.length === 1);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a one-shot twice across stop and start cycles', async () => {
    const task = jest.fn();

    cron.add({
      runOnce: {
        task,
        options: new Date(Date.now() + 200),
      },
    });

    cron.start();
    cron.stop();
    cron.start();

    await waitFor(() => task.mock.calls.length === 1);
    expect(task).toHaveBeenCalledTimes(1);

    cron.stop();
    cron.start();
    await sleep(200);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('keeps a past Date job without running or throwing', async () => {
    const task = jest.fn();

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

    await sleep(100);
    expect(task).not.toHaveBeenCalled();
  });

  it('remove stops a named job', async () => {
    const task = jest.fn();

    cron.start();
    cron.add({
      namedJob: {
        task,
        options: '*/1 * * * * *',
      },
    });

    cron.remove('namedJob');
    expect(cron.jobs).toHaveLength(0);

    await sleep(1100);
    expect(task).not.toHaveBeenCalled();
  });

  it('remove ignores an unknown name', () => {
    cron.add({
      existingJob: {
        task: jest.fn(),
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
          task: jest.fn(),
          options: firstSchedule,
        },
      });
      cron.add({
        publishRelease: {
          task: jest.fn(),
          options: replacementSchedule,
        },
      });
    }).not.toThrow();

    expect(cron.jobs).toHaveLength(2);
  });

  it('remove drops every job with the given name', () => {
    cron.add({
      publishRelease: {
        task: jest.fn(),
        options: new Date(Date.now() + 60_000),
      },
    });
    cron.add({
      publishRelease: {
        task: jest.fn(),
        options: new Date(Date.now() + 120_000),
      },
    });

    cron.remove('publishRelease');

    expect(cron.jobs).toHaveLength(0);
  });

  it('destroy clears jobs and prevents further runs', async () => {
    const task = jest.fn();

    cron.start();
    cron.add({
      namedJob: {
        task,
        options: '*/1 * * * * *',
      },
    });

    cron.destroy();
    expect(cron.jobs).toHaveLength(0);

    await sleep(1100);
    expect(task).not.toHaveBeenCalled();
  });

  it('logs errors thrown by job handlers', async () => {
    cron.start();
    cron.add({
      boom: {
        async task() {
          throw new Error('cron-boom');
        },
        options: new Date(Date.now() + 100),
      },
    });

    await waitFor(() => global.strapi.log.error.mock.calls.length === 1);

    expect(global.strapi.log.error).toHaveBeenCalledWith(
      'Cron job "boom" failed',
      expect.any(Error)
    );
  });

  it('accepts 5-field and 6-field cron strings', () => {
    cron.start();
    cron.add({
      fiveField: {
        task: jest.fn(),
        options: '0 0 * * *',
      },
      sixField: {
        task: jest.fn(),
        options: '0 0 0 * * *',
      },
    });

    expect(cron.jobs).toHaveLength(2);
    expect(cron.jobs[0].job.nextRun()).toBeInstanceOf(Date);
    expect(cron.jobs[1].job.nextRun()).toBeInstanceOf(Date);
  });

  it.each([
    ['Sunday as 0', '0 0 * * 0'],
    ['Sunday as 7', '0 0 * * 7'],
  ])('accepts %s', (_title, options) => {
    expect(() =>
      cron.add({
        sundayJob: {
          task: jest.fn(),
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
          task: jest.fn(),
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
        task: jest.fn(),
        options: { dayOfWeek: 1, hour: 1, minute: 0, tz: 'UTC' },
      },
      recurrenceRuleShaped: {
        task: jest.fn(),
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
        task: jest.fn(),
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
        task: jest.fn(),
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
        task: jest.fn(),
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
      dateRule: { task: jest.fn(), options: { rule: date } },
      timestampRule: { task: jest.fn(), options: { rule: timestamp } },
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
    const task = jest.fn();
    cron.start();
    cron.add({
      cancelMe: {
        task,
        options: new Date(Date.now() + 150),
      },
    });

    expect(cron.jobs[0].job.cancel()).toBe(true);
    await sleep(250);
    expect(task).not.toHaveBeenCalled();
  });

  it('reschedule preserves the handle and keeps the old schedule on failure', () => {
    cron.start();
    cron.add({
      first: {
        task: jest.fn(),
        options: '0 0 * * *',
      },
      second: {
        task: jest.fn(),
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
        task: jest.fn(),
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
          request: jest.fn(),
          options: '0 0 * * *',
        },
      } as never)
    ).toThrow('Could not schedule a cron job for "invalidTaskObject": no function found.');
  });

  it('keeps valid jobs when a later schedule in the same add() is invalid', () => {
    expect(() =>
      cron.add({
        goodJob: {
          task: jest.fn(),
          options: '0 0 * * *',
        },
        badJob: {
          task: jest.fn(),
          options: 'not a cron expression',
        },
      })
    ).not.toThrow();

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].name).toBe('goodJob');
  });

  it('reschedules a named Date job when the caller removes first then adds', async () => {
    const first = jest.fn();
    const second = jest.fn();

    cron.start();
    cron.add({
      publishRelease_1: {
        task: first,
        options: new Date(Date.now() + 200),
      },
    });
    cron.remove('publishRelease_1');
    cron.add({
      publishRelease_1: {
        task: second,
        options: new Date(Date.now() + 200),
      },
    });

    expect(cron.jobs).toHaveLength(1);
    await waitFor(() => second.mock.calls.length === 1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
