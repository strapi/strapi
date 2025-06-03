import { format, Logform } from 'winston';
import logErrors from './log-errors';

const defaultTimestampFormat = 'YYYY-MM-DD HH:mm:ss.SSS';

export interface PrettyPrintOptions {
  /**
   * Enable or disable timestamps print if it's a boolean value. Use the given format for the timestamps if it's a string
   */
  timestamps?: Logform.TimestampOptions['format'] | boolean;
  /**
   * Enable or disable the use of colors for the log level
   */
  colors?: boolean;
}

/**
 * Create a pretty print formatter for a winston logger
 * @param options
 */
export default (options: PrettyPrintOptions = {}): Logform.Format => {
  const { timestamps = true, colors = true } = options;

  const handlers: Logform.Format[] = [];

  if (timestamps) {
    handlers.push(
      format.timestamp({
        format: timestamps === true ? defaultTimestampFormat : timestamps,
      })
    );
  }

  if (colors) {
    handlers.push(format.colorize());
  }

  handlers.push(logErrors());

  handlers.push(
    format.printf(({ level, message, timestamp }) => {
      return `${timestamps ? `[${timestamp as string}] ` : ''}${level}: ${message as string}`;
    })
  );

  return format.combine(...handlers);
};
