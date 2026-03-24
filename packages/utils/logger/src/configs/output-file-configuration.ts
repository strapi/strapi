import { transports, LoggerOptions } from 'winston';

import { LEVEL_LABEL, LEVELS } from '../constants';
import { prettyPrint, excludeColors } from '../formats';

export type OutputFileLoggerOptions = {
  /** Console only: omit noisy `info` when e.g. `warn` (file transport still uses `fileTransportOptions.level`). */
  consoleLevel?: string;
};

export default (
  filename: string,
  fileTransportOptions: transports.FileTransportOptions = {},
  options?: OutputFileLoggerOptions
): LoggerOptions => {
  const consoleLevel = options?.consoleLevel ?? LEVEL_LABEL;

  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [
      new transports.Console({
        level: consoleLevel,
      }),
      new transports.File({
        level: 'error',
        filename,
        format: excludeColors,
        ...fileTransportOptions,
      }),
    ],
  };
};
