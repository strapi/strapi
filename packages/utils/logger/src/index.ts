import winston, { LoggerOptions } from 'winston';

import * as formats from './formats';
import * as configs from './configs';

const createLogger = (userConfiguration: LoggerOptions = {}): winston.Logger => {
  const configuration = configs.createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

export { createLogger, winston, formats, configs };
