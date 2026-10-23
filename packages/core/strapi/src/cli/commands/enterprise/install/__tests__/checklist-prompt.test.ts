import { PassThrough } from 'node:stream';

import {
  promptChecklist,
  type ChecklistChoice,
  type ChecklistLockedGroup,
} from '../checklist-prompt';
import { PromptCancelledError } from '../errors';

const KEYS = { enter: '\r', down: '\u001B[B', up: '\u001B[A', space: ' ', ctrlC: '\u0003' };

const ESCAPE = String.fromCharCode(27);
const ANSI = new RegExp(`${ESCAPE}\\[[0-9;?]*[A-Za-z]`, 'g');
const CLEAR_SCREEN_DOWN = new RegExp(`${ESCAPE}\\[\\d*J`);

const choices: ChecklistChoice[] = [
  { name: 'Plugin A  1.0.0', value: 'plugin-a@1.0.0', short: 'Plugin A' },
  { name: 'Plugin B', disabled: 'not in your license' },
  {
    name: 'Plugin C  1.0.0 → 1.1.0 [upgrade]',
    value: 'plugin-c@1.1.0',
    short: 'Plugin C',
    checked: true,
  },
];

const lockedGroup: ChecklistLockedGroup = {
  heading: 'Not in your license. Contact Sales.',
  choices: [{ name: 'Plugin D  Does things.', disabled: 'not in your license' }],
};

const startPrompt = (
  promptChoices: ChecklistChoice[] = choices,
  columns = 120,
  promptLockedGroup?: ChecklistLockedGroup
) => {
  const input = new PassThrough() as unknown as NodeJS.ReadStream;
  const output = new PassThrough() as unknown as NodeJS.WriteStream;
  Object.assign(output, { columns });
  let drawn = '';
  output.on('data', (chunk: Buffer) => {
    drawn += chunk.toString();
  });

  const answer = promptChecklist({
    message: 'Which plugins?',
    choices: promptChoices,
    lockedGroup: promptLockedGroup,
    input,
    output,
  });

  return {
    answer,
    press: (...keys: string[]) => keys.forEach((key) => input.write(key)),
    async cancel() {
      input.write(KEYS.ctrlC);
      await answer.catch(() => undefined);
    },
    screen: () => drawn.split(CLEAR_SCREEN_DOWN).at(-1)!.replace(ANSI, ''),
  };
};

describe('promptChecklist', () => {
  it('opens on a blank line, without key hints, Submit last and apart', async () => {
    const prompt = startPrompt();

    expect(prompt.screen()).toBe(
      [
        '',
        'Which plugins?',
        '❯ ◯ Plugin A  1.0.0',
        '  - Plugin B (not in your license)',
        '  ◉ Plugin C  1.0.0 → 1.1.0 [upgrade]',
        '',
        '  Submit',
        '',
      ].join('\n')
    );
    expect(prompt.screen()).not.toMatch(/Press|<space>/);
    await prompt.cancel();
  });

  it('ticks a choice with Enter, and submits with Enter on Submit', async () => {
    const prompt = startPrompt();

    prompt.press(KEYS.enter, KEYS.down, KEYS.enter, KEYS.down, KEYS.enter);

    await expect(prompt.answer).resolves.toEqual(['plugin-a@1.0.0']);
    expect(prompt.screen()).toBe('Which plugins? Plugin A\n');
  });

  it('skips greyed-out rows and wraps around from Submit', async () => {
    const prompt = startPrompt();

    prompt.press(KEYS.down);
    expect(prompt.screen()).toContain('❯ ◉ Plugin C');

    prompt.press(KEYS.down);
    expect(prompt.screen()).toContain('❯ Submit');

    prompt.press(KEYS.down);
    expect(prompt.screen()).toContain('❯ ◯ Plugin A');

    prompt.press(KEYS.up, KEYS.enter);
    await expect(prompt.answer).resolves.toEqual(['plugin-c@1.1.0']);
  });

  it('still ticks with Space, which never submits', async () => {
    const prompt = startPrompt();

    prompt.press(KEYS.space, KEYS.up, KEYS.space);
    expect(prompt.screen()).toContain('❯ Submit');

    prompt.press(KEYS.enter);
    await expect(prompt.answer).resolves.toEqual(['plugin-a@1.0.0', 'plugin-c@1.1.0']);
  });

  it('answers "none" when nothing is ticked', async () => {
    const prompt = startPrompt([{ name: 'Plugin A', value: 'plugin-a@1.0.0' }]);

    prompt.press(KEYS.down, KEYS.enter);

    await expect(prompt.answer).resolves.toEqual([]);
    expect(prompt.screen()).toBe('Which plugins? none\n');
  });

  it('shortens a line wider than the terminal, so it never wraps', async () => {
    const prompt = startPrompt([{ name: 'A'.repeat(200), value: 'a' }], 40);

    const choiceLine = prompt.screen().split('\n')[2];
    expect(choiceLine).toHaveLength(39);
    expect(choiceLine.endsWith('…')).toBe(true);
    await prompt.cancel();
  });

  it('shows the locked group under its heading, after the choices and before Submit', async () => {
    const prompt = startPrompt(choices, 120, lockedGroup);

    expect(prompt.screen()).toBe(
      [
        '',
        'Which plugins?',
        '❯ ◯ Plugin A  1.0.0',
        '  - Plugin B (not in your license)',
        '  ◉ Plugin C  1.0.0 → 1.1.0 [upgrade]',
        '',
        '  Not in your license. Contact Sales.',
        '  ✕ Plugin D  Does things.',
        '',
        '  Submit',
        '',
      ].join('\n')
    );
    await prompt.cancel();
  });

  it('never lands on a locked row, and never returns one', async () => {
    const prompt = startPrompt(choices, 120, lockedGroup);

    prompt.press(KEYS.down, KEYS.down);
    expect(prompt.screen()).toContain('❯ Submit');

    prompt.press(KEYS.up);
    expect(prompt.screen()).toContain('❯ ◉ Plugin C');

    prompt.press(KEYS.up, KEYS.up);
    expect(prompt.screen()).toContain('❯ Submit');

    prompt.press(KEYS.enter);
    await expect(prompt.answer).resolves.toEqual(['plugin-c@1.1.0']);
  });

  it('wraps a long heading on words, so the link is never cut', async () => {
    const link = 'https://strapi.io/contact-sales';
    const prompt = startPrompt(choices, 40, {
      ...lockedGroup,
      heading: `Not in your license. Contact Sales to enable them: ${link}`,
    });

    const lines = prompt.screen().split('\n');
    expect(lines).toContain(`  ${link}`);
    expect(lines.every((line) => line.length <= 39)).toBe(true);
    await prompt.cancel();
  });

  it('stops with a PromptCancelledError on Ctrl+C', async () => {
    const prompt = startPrompt();

    prompt.press(KEYS.ctrlC);

    await expect(prompt.answer).rejects.toBeInstanceOf(PromptCancelledError);
  });
});
