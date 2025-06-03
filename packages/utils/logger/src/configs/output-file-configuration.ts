import { transports, LoggerOptions } from 'winston';

import { LEVEL_LABEL, LEVELS } from '../constants';
import { prettyPrint, excludeColors } from '../formats';

export default (
  filename: string,
  fileTransportOptions: transports.FileTransportOptions = {}
): LoggerOptions => {
  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [
      new transports.Console(),
      new transports.File({
        level: 'error',
        filename,
        format: excludeColors,
        ...fileTransportOptions,
      }),
    ],
  };
};
