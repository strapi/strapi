import { format, type Logform } from 'winston';

export type { Logform };

export default (...levels: string[]) => {
  return format((info) => (levels.some((level) => info.level.includes(level)) ? info : false))();
};
