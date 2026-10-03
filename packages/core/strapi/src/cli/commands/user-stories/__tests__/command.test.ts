import { Command } from 'commander';
import type { CLIContext } from '../../../types';

const actionMock = jest.fn();
jest.mock('../action', () => ({
  __esModule: true,
  action: (...args: unknown[]) => actionMock(...args),
}));

// Passthrough: exercises the real wiring (command.ts calling `runAction(name, action)`) without
// requiring a real Strapi project on disk, which the real `runAction` asserts via `process.cwd()`.
const runActionMock = jest.fn((_name: string, fn: (...args: unknown[]) => unknown) => fn);
jest.mock('../../../utils/helpers', () => ({
  __esModule: true,
  runAction: (...args: [string, (...a: unknown[]) => unknown]) => runActionMock(...args),
}));

// eslint-disable-next-line import/first
import { command } from '../command';

const ctx = {} as CLIContext;
const buildCommand = () => command({ command: new Command(), argv: [], ctx }) as Command;

describe('user-stories:sync-e2e command', () => {
  beforeEach(() => {
    actionMock.mockClear();
    runActionMock.mockClear();
  });

  it('builds a commander command with the expected name, description and option defaults', () => {
    const cmd = buildCommand();

    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('user-stories:sync-e2e');
    expect(cmd.description()).toBe(
      'Scaffold/reconcile Vitest e2e specs from docs/user-stories acceptance criteria'
    );
    expect(cmd.opts()).toEqual({
      input: 'docs/user-stories',
      write: false,
      force: false,
    });
  });

  it('wires the sync action through runAction under the command name', () => {
    buildCommand();

    expect(runActionMock).toHaveBeenCalledWith('user-stories:sync-e2e', expect.any(Function));
  });

  it('invokes the sync action with parsed CLI options when the command runs', async () => {
    const cmd = buildCommand();

    await cmd.parseAsync(['-i', 'custom/dir', '-w', '-f'], { from: 'user' });

    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(actionMock.mock.calls[0][0]).toEqual({
      input: 'custom/dir',
      write: true,
      force: true,
    });
  });
});
