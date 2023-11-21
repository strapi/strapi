import chalk from 'chalk';

import { createLogger } from '../../core';

import type { Logger } from '../../core';

const noop = () => {};

describe('Logger', () => {
  const text = 'Hello World!';
  const now = new Date();

  beforeAll(() => {
    jest.useFakeTimers({ now });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(noop);
    jest.spyOn(console, 'info').mockImplementation(noop);
    jest.spyOn(console, 'warn').mockImplementation(noop);
    jest.spyOn(console, 'error').mockImplementation(noop);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const logWith = (logger: Logger) => {
    logger.debug(text);
    logger.raw(text);
    logger.info(text);
    logger.warn(text);
    logger.error(text);
  };

  const expectLoggerProps = (
    logger: Logger,
    props: Pick<Logger, 'isSilent' | 'isDebug' | 'warnings' | 'errors'>
  ) => {
    Object.entries(props).forEach(([key, expected]) => expect(logger[key]).toStrictEqual(expected));
  };

  test('Prefixes', () => {
    const logger = createLogger({ silent: false, debug: true });

    logWith(logger);

    const isoString = now.toISOString();

    // logger.info(...)
    expect(console.info).toHaveBeenCalledWith(chalk.blue(`[INFO]\t[${isoString}]`), text);
    // logger.warn(...)
    expect(console.warn).toHaveBeenCalledWith(chalk.yellow(`[WARN]\t[${isoString}]`), text);
    // logger.error(...)
    expect(console.error).toHaveBeenCalledWith(chalk.red(`[ERROR]\t[${isoString}]`), text);

    /**
     * Both debug & raw uses console.log
     */

    // debug
    expect(console.log).toHaveBeenNthCalledWith(1, chalk.cyan(`[DEBUG]\t[${isoString}]`), text);
    // raw
    expect(console.log).toHaveBeenNthCalledWith(2, text);
  });

  test('silent=false, debug=false', () => {
    const logger = createLogger({ silent: false, debug: false });

    logWith(logger);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);

    expectLoggerProps(logger, { isSilent: false, isDebug: false, errors: 1, warnings: 1 });
  });

  test('silent=true, debug=false', () => {
    const logger = createLogger({ silent: true, debug: false });

    logWith(logger);

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.info).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(0);

    expectLoggerProps(logger, { isSilent: true, isDebug: false, errors: 1, warnings: 1 });
  });

  test('silent=false, debug=true', () => {
    const logger = createLogger({ silent: false, debug: true });

    logWith(logger);

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);

    expectLoggerProps(logger, { isSilent: false, isDebug: true, errors: 1, warnings: 1 });
  });

  test('silent=true, debug=true', () => {
    const logger = createLogger({ silent: true, debug: true });

    logWith(logger);

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.info).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(0);

    expectLoggerProps(logger, { isSilent: true, isDebug: true, errors: 1, warnings: 1 });
  });
});
