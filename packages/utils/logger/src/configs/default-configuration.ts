import { transports, LoggerOptions } from 'winston';
import { LEVEL_LABEL, LEVELS } from '../constants';
import { prettyPrint } from '../formats';

export default (): LoggerOptions => {
  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [new transports.Console()],
  };
};
