import readline from 'readline';
import chalk from 'chalk';

import { PromptCancelledError } from './errors';

export interface ChecklistChoice {
  name: string;
  value?: string;
  short?: string;
  checked?: boolean;
  disabled?: string;
}

const SUBMIT_LABEL = 'Submit';

const fitWidth = (text: string, width: number): string =>
  text.length <= width ? text : `${text.slice(0, Math.max(width - 1, 0))}…`;

export const promptChecklist = ({
  message,
  choices,
  input = process.stdin,
  output = process.stdout,
}: {
  message: string;
  choices: ChecklistChoice[];
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
}): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const checked = choices.map((choice) => Boolean(choice.checked));
    const submitIndex = choices.length;
    const stops = [
      ...choices.flatMap((choice, index) => (choice.disabled === undefined ? [index] : [])),
      submitIndex,
    ];
    let cursor = 0;
    let renderedLineCount = 0;

    const width = () => Math.max((output.columns || 80) - 1, 20);

    const renderChoice = (choice: ChecklistChoice, index: number): string => {
      if (choice.disabled !== undefined) {
        return chalk.dim(fitWidth(`  - ${choice.name} (${choice.disabled})`, width()));
      }

      const isActive = stops[cursor] === index;
      const box = checked[index] ? chalk.green('◉') : '◯';
      const name = fitWidth(choice.name, width() - 4);

      return isActive ? `${chalk.cyan('❯')} ${box} ${chalk.cyan(name)}` : `  ${box} ${name}`;
    };

    const renderSubmit = () =>
      stops[cursor] === submitIndex
        ? `${chalk.cyan('❯')} ${chalk.cyan.bold(SUBMIT_LABEL)}`
        : `  ${chalk.bold(SUBMIT_LABEL)}`;

    const draw = (lines: string[]) => {
      if (renderedLineCount > 0) {
        readline.moveCursor(output, 0, -renderedLineCount);
        readline.cursorTo(output, 0);
        readline.clearScreenDown(output);
      }

      output.write(`${lines.join('\n')}\n`);
      renderedLineCount = lines.length;
    };

    const question = chalk.bold(message);
    const render = () => draw([question, ...choices.map(renderChoice), '', renderSubmit()]);

    const stop = () => {
      input.removeListener('keypress', onKeypress);
      if (input.isTTY) {
        input.setRawMode(false);
      }
      input.pause();
      output.write('\u001B[?25h');
    };

    const submit = () => {
      const selected = choices.filter(
        (choice, index) => choice.disabled === undefined && checked[index]
      );
      const answer = selected.map((choice) => choice.short ?? choice.name).join(', ');

      draw([`${question} ${chalk.cyan(answer || 'none')}`]);
      stop();
      resolve(selected.flatMap((choice) => (choice.value === undefined ? [] : [choice.value])));
    };

    function onKeypress(_text: string, key: readline.Key | undefined) {
      if (!key) {
        return;
      }

      if (key.ctrl && key.name === 'c') {
        stop();
        reject(new PromptCancelledError());
        return;
      }

      switch (key.name) {
        case 'up':
        case 'k':
          cursor = (cursor - 1 + stops.length) % stops.length;
          break;
        case 'down':
        case 'j':
        case 'tab':
          cursor = (cursor + 1) % stops.length;
          break;
        case 'return':
        case 'enter':
        case 'space':
          if (stops[cursor] === submitIndex) {
            if (key.name !== 'space') {
              submit();
            }
            return;
          }
          checked[stops[cursor]] = !checked[stops[cursor]];
          break;
        default:
          return;
      }

      render();
    }

    readline.emitKeypressEvents(input);
    if (input.isTTY) {
      input.setRawMode(true);
    }
    input.on('keypress', onKeypress);
    input.resume();

    output.write('\n\u001B[?25l');
    render();
  });
