import { format } from 'winston';

export default (...levels: string[]) => {
  return format((info) => (levels.some((level) => info.level.includes(level)) ? info : false))();
};
