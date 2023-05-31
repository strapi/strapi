import { format } from 'winston';

/**
 * This will remove the chalk color codes from the message provided.
 * It's used to log plain text in the log file
 */
export default format.printf(({ message }) => {
  if (typeof message !== 'string') {
    return message;
  }

  return message.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
});
