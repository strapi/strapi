import * as winston from 'winston';
import * as configs from './configs';

export * as formats from './formats';

export interface Logger extends winston.Logger {}
export interface LoggerOptions extends winston.LoggerOptions {}

const createLogger = (userConfiguration: LoggerOptions = {}): Logger => {
  const configuration = configs.createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

export { createLogger, winston, configs };
