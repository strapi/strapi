import chalk from 'chalk';
import { isString, isArray } from 'lodash/fp';
import type { Command } from 'commander';

const bytesPerKb = 1024;
const sizes = ['B ', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Convert bytes to a human readable formatted string, for example "1024" becomes "1KB"
 */
const readableBytes = (bytes: number, decimals = 1, padStart = 0) => {
  if (!bytes) {
    return '0';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(bytesPerKb));
  const result = `${parseFloat((bytes / bytesPerKb ** i).toFixed(decimals))} ${sizes[i].padStart(
    2
  )}`;

  return result.padStart(padStart);
};

interface ExitWithOptions {
  logger?: Console;
  prc?: NodeJS.Process;
}

/**
 *
 * Display message(s) to console and then call process.exit with code.
 * If code is zero, console.log and green text is used for messages, otherwise console.error and red text.
 *
 */
const exitWith = (code: number, message?: string | string[], options: ExitWithOptions = {}) => {
  const { logger = console, prc = process } = options;

  const log = (message: string) => {
    if (code === 0) {
      logger.log(chalk.green(message));
    } else {
      logger.error(chalk.red(message));
    }
  };

  if (isString(message)) {
    log(message);
  } else if (isArray(message)) {
    message.forEach((msg) => log(msg));
  }

  prc.exit(code);
};

/**
 * assert that a URL object has a protocol value
 *
 */
const assertUrlHasProtocol = (url: URL, protocol?: string | string[]) => {
  if (!url.protocol) {
    exitWith(1, `${url.toString()} does not have a protocol`);
  }

  // if just checking for the existence of a protocol, return
  if (!protocol) {
    return;
  }

  if (isString(protocol)) {
    if (protocol !== url.protocol) {
      exitWith(1, `${url.toString()} must have the protocol ${protocol}`);
    }
    return;
  }

  // assume an array
  if (!protocol.some((protocol) => url.protocol === protocol)) {
    return exitWith(
      1,
      `${url.toString()} must have one of the following protocols: ${protocol.join(',')}`
    );
  }
};

type ConditionCallback = (opts: Record<string, any>) => Promise<boolean>;
type IsMetCallback = (command: Command) => Promise<void>;
type IsNotMetCallback = (command: Command) => Promise<void>;

/**
 * Passes commander options to conditionCallback(). If it returns true, call isMetCallback otherwise call isNotMetCallback
 */
const ifOptions = (
  conditionCallback: ConditionCallback,
  isMetCallback: IsMetCallback = async () => {},
  isNotMetCallback: IsNotMetCallback = async () => {}
) => {
  return async (command: Command) => {
    const opts = command.opts();
    if (await conditionCallback(opts)) {
      await isMetCallback(command);
    } else {
      await isNotMetCallback(command);
    }
  };
};

export { exitWith, assertUrlHasProtocol, ifOptions, readableBytes };
