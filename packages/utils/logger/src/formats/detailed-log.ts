import type { Format } from 'logform';
import { format } from 'winston';

/**
 * This will remove the chalk color codes from the message provided.
 * It's used to log plain text in the log file
 */
const detailedLog: Format = format.printf(({ message, level, timestamp }): string => {
  if (typeof message !== 'string') {
    return String(message);
  }

  const newMessage = `[${timestamp as string}] ${level}: ${message as string}`;

  return newMessage.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
});

export default detailedLog;
