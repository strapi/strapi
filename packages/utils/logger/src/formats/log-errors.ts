import { format, Logform } from 'winston';

const logErrors: Logform.FormatWrap = format((info) => {
  if (info instanceof Error) {
    return { ...info, message: `${info.message as string}${info.stack ? `\n${info.stack}` : ''}` };
  }

  return info;
});

export default logErrors;
