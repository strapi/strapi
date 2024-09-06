import chalk from 'chalk';
import type { ChalkFunction } from 'chalk';

const MAX_PREFIX_LENGTH = 8;

const badge = (text: string, bgColor: ChalkFunction, textColor: ChalkFunction = chalk.black) => {
  const wrappedText = ` ${text} `;

  const repeat = Math.max(0, MAX_PREFIX_LENGTH - wrappedText.length);

  return ' '.repeat(repeat) + bgColor(textColor(wrappedText));
};

const textIndent = (
  text: string | string[],
  indentFirst = true,
  indent: number = MAX_PREFIX_LENGTH + 2
) => {
  const parts = Array.isArray(text) ? text : [text];

  return parts
    .map((part, i) => {
      if (i === 0 && !indentFirst) {
        return part;
      }

      return ' '.repeat(indent) + part;
    })
    .join('\n');
};

export const logger = {
  log(message: string | string[]): void {
    console.log(textIndent(message));
  },
  title(title: string, message: string): void {
    const prefix = badge(title, chalk.bgBlueBright);
    console.log(`\n${prefix}  ${message}`);
  },
  info(message: string): void {
    console.log(`${' '.repeat(7)}${chalk.cyan('●')}  ${message}`);
  },
  success(message: string): void {
    console.log(`\n${' '.repeat(7)}${chalk.green('✓')}  ${chalk.green(message)}`);
  },
  fatal(message?: string | string[]): never {
    const prefix = badge('Error', chalk.bgRed);

    if (message) {
      console.error(`\n${prefix}  ${textIndent(message, false)}\n`);
    }

    process.exit(1);
  },
  error(message: string | string[]): void {
    const prefix = badge('Error', chalk.bgRed);
    console.error(`\n${prefix}  ${textIndent(message, false)}\n`);
  },
  warn(message: string | string[]): void {
    const prefix = badge('Warn', chalk.bgYellow);
    console.warn(`\n${prefix}  ${textIndent(message, false)}\n`);
  },
};
