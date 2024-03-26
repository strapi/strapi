/**
 * Removes the color pieces from a string, useful
 * for testing strings when you use `chalk`.
 */

// eslint-disable-next-line no-control-regex
const ANSI_COLOR_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function stripColor(str: string) {
  return str.replace(ANSI_COLOR_RE, '');
}

export { stripColor };
