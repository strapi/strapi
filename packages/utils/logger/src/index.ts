import * as winston from 'winston';
import * as configs from './configs';

export * as formats from './formats';

export type Logger = winston.Logger;

const createLogger = (userConfiguration: winston.LoggerOptions = {}): winston.Logger => {
  const configuration = configs.createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

export { createLogger, winston, configs };
