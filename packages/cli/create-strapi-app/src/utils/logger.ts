import { styleText } from 'node:util';

const MAX_PREFIX_LENGTH = 8;

type BackgroundColor = Extract<Parameters<typeof styleText>[0], `bg${string}`>;

const badge = (text: string, bgColor: BackgroundColor) => {
  const wrappedText = ` ${text} `;

  const repeat = Math.max(0, MAX_PREFIX_LENGTH - wrappedText.length);

  return ' '.repeat(repeat) + styleText([bgColor, 'black'], wrappedText);
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
    const prefix = badge(title, 'bgBlueBright');
    console.log(`\n${prefix}  ${message}`);
  },
  info(message: string): void {
    console.log(`${' '.repeat(7)}${styleText('cyan', '●')}  ${message}`);
  },
  success(message: string): void {
    console.log(`\n${' '.repeat(7)}${styleText('green', '✓')}  ${styleText('green', message)}`);
  },
  fatal(message?: string | string[]): never {
    const prefix = badge('Error', 'bgRed');

    if (message) {
      console.error(`\n${prefix}  ${textIndent(message, false)}\n`);
    }

    process.exit(1);
  },
  error(message: string | string[]): void {
    const prefix = badge('Error', 'bgRed');
    console.error(`\n${prefix}  ${textIndent(message, false)}\n`);
  },
  warn(message: string | string[]): void {
    const prefix = badge('Warn', 'bgYellow');
    console.warn(`\n${prefix}  ${textIndent(message, false)}\n`);
  },
};
