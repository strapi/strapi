import createCronService from '../cron';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

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

  it('schedules a named Date one-shot after start', async () => {
    const task = jest.fn();

    cron.start();
    cron.add({
      publishOnce: {
        task,
        options: new Date(Date.now() + 150),
      },
    });

    expect(cron.jobs).toHaveLength(1);
    expect(cron.jobs[0].name).toBe('publishOnce');

    await sleep(350);

    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith({ strapi: global.strapi });
  });

  it('does not run jobs until start, then resumes', async () => {
    const task = jest.fn();

    cron.add({
      '*/1 * * * * *': task,
    });

    await sleep(1100);
    expect(task).not.toHaveBeenCalled();

    cron.start();
    await sleep(1100);

    expect(task).toHaveBeenCalled();
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

    await sleep(300);

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
});
