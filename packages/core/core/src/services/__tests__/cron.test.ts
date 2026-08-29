import type { Core } from '@strapi/types';
import createCronService from '../cron';

/**
 * These tests deliberately never assign `global.strapi`.
 *
 * The bug they guard against (#27469) is the cron service resolving the ambient
 * global `strapi` at call time: once `Strapi.destroy()` has run `delete global.strapi`,
 * a job that was still in flight rejects, `node-schedule` emits 'error', and the
 * handler throws instead of logging. Leaving the global unset reproduces that
 * exact condition.
 */
const createMockStrapi = () => {
  const error = jest.fn();
  const strapi = { log: { error } } as unknown as Core.Strapi;

  return { strapi, error };
};

describe('Cron', () => {
  it('logs a job failure through the injected strapi instance', () => {
    const { strapi, error: logError } = createMockStrapi();
    const cron = createCronService(strapi);

    cron.add({ myTask: { options: '* * * * * *', task: jest.fn() } });

    const error = new Error('job failed');
    expect(() => cron.jobs[0].job.emit('error', error)).not.toThrow();

    expect(logError).toHaveBeenCalledWith('Cron job "myTask" failed', error);
  });

  it('uses the rule as the job name when the task is declared as a function', () => {
    const { strapi, error: logError } = createMockStrapi();
    const cron = createCronService(strapi);

    cron.add({ '* * * * * *': jest.fn() });

    const error = new Error('job failed');
    cron.jobs[0].job.emit('error', error);

    expect(logError).toHaveBeenCalledWith('Cron job "* * * * * *" failed', error);
  });

  // Regression test for #27469
  it('still logs, without throwing, when a job rejects after destroy()', () => {
    const { strapi, error: logError } = createMockStrapi();
    const cron = createCronService(strapi);

    cron.add({ uploadWeekly: { options: '* * * * * *', task: jest.fn() } });
    const { job } = cron.jobs[0];

    cron.destroy();

    // node-schedule cannot retract an invocation that is already running, so it
    // emits 'error' from the rejected promise once teardown has completed.
    const error = new Error('Cannot read db: connection destroyed');
    expect(() => job.emit('error', error)).not.toThrow();

    expect(logError).toHaveBeenCalledWith('Cron job "uploadWeekly" failed', error);
  });

  it('passes the injected strapi instance to the task', () => {
    const { strapi } = createMockStrapi();
    const task = jest.fn();
    const cron = createCronService(strapi);

    cron.add({ myTask: { options: '* * * * * *', task } });
    cron.jobs[0].job.invoke();

    expect(task).toHaveBeenCalled();
    expect(task.mock.calls[0][0].strapi).toBe(strapi);
  });

  it('cancels every job on stop()', () => {
    const { strapi } = createMockStrapi();
    const cron = createCronService(strapi);

    cron.add({ first: { options: '* * * * * *', task: jest.fn() } });
    cron.add({ second: { options: '* * * * * *', task: jest.fn() } });

    const cancels = cron.jobs.map(({ job }) => jest.spyOn(job, 'cancel'));

    cron.stop();

    expect(cancels).toHaveLength(2);
    cancels.forEach((cancel) => expect(cancel).toHaveBeenCalled());
  });

  it('cancels every job on destroy()', () => {
    const { strapi } = createMockStrapi();
    const cron = createCronService(strapi);

    cron.add({ myTask: { options: '* * * * * *', task: jest.fn() } });
    const cancel = jest.spyOn(cron.jobs[0].job, 'cancel');

    cron.destroy();

    expect(cancel).toHaveBeenCalled();
  });
});
