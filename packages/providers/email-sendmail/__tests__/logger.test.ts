import { createLogger } from '../src/logger';

describe('createLogger', () => {
  it('uses custom logger even when silent is true (legacy guileen/node-sendmail)', () => {
    const debug = jest.fn();
    const logger = createLogger({
      silent: true,
      logger: { debug },
    });
    logger.debug('msg');
    expect(debug).toHaveBeenCalledWith('msg');
  });

  it('noops missing methods on a partial custom logger', () => {
    const logger = createLogger({
      silent: false,
      logger: { error: jest.fn() },
    });
    expect(() => logger.debug('x')).not.toThrow();
  });

  it('suppresses console when silent and no custom logger', () => {
    const logger = createLogger({ silent: true });
    expect(() => logger.error('e')).not.toThrow();
  });
});
