import type { Format } from 'logform';
import { format } from 'winston';

const levelFilter = (...levels: string[]): Format => {
  return format((info) => (levels.some((level) => info.level.includes(level)) ? info : false))();
};

export default levelFilter;
