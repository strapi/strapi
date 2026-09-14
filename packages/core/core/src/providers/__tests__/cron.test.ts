import cronProvider from '../cron';

describe('cron provider', () => {
  describe('init', () => {
    it('registers the cron service with the strapi instance injected', () => {
      const add = jest.fn();
      const logError = jest.fn();
      const strapi = { add, log: { error: logError } } as any;

      cronProvider.init!(strapi);

      expect(add).toHaveBeenCalledWith('cron', expect.any(Function));

      // the registered factory must build the service from the instance, not from
      // the ambient global, so that it survives `delete global.strapi` (#27469)
      const factory = add.mock.calls[0][1];
      const cron = factory();

      cron.add({ myTask: { options: '* * * * * *', task: jest.fn() } });
      cron.jobs[0].job.emit('error', new Error('job failed'));

      expect(logError).toHaveBeenCalledWith('Cron job "myTask" failed', expect.any(Error));
    });
  });

  describe('destroy', () => {
    it('stops cron before Strapi tears down the rest of the instance', async () => {
      const cron = { destroy: jest.fn() };
      const strapi = { get: jest.fn(() => cron) } as any;

      await cronProvider.destroy!(strapi);

      expect(strapi.get).toHaveBeenCalledWith('cron');
      expect(cron.destroy).toHaveBeenCalled();
    });
  });
});
