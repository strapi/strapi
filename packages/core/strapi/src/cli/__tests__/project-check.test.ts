import { createCommand } from 'commander';
import { isDependencyInCwd } from '@strapi/utils';

import { createCLI } from '../index';

jest.mock('../commands', () => {
  const { createCommand: create } = jest.requireActual('commander');

  const parent = create('parent');
  parent.command('child').action(() => {});

  return {
    commands: [
      () => create('root-level').action(() => {}),
      () => create('version').action(() => {}),
      () => parent,
    ],
  };
});

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  isDependencyInCwd: jest.fn(),
}));

const mockedIsDependencyInCwd = isDependencyInCwd as jest.MockedFunction<typeof isDependencyInCwd>;

const consoleMock = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
};

const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const run = async (...args: string[]) => {
  const argv = ['node', '/fake/strapi.js', ...args];
  const cli = await createCLI(argv, createCommand());

  await cli.parseAsync(argv);
};

describe('CLI project check', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('outside of a Strapi project', () => {
    beforeEach(() => {
      mockedIsDependencyInCwd.mockReturnValue(false);
    });

    it('rejects a command before running its action', async () => {
      await run('root-level');

      expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining('strapi root-level'));
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('uses the full invocation path of a nested command', async () => {
      await run('parent', 'child');

      expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining('strapi parent child'));
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('allows commands that can run outside of a Strapi project', async () => {
      await run('version');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('allows deprecated commands', async () => {
      await run('plugin:build');

      expect(exitMock).not.toHaveBeenCalled();
    });
  });

  describe('inside a Strapi project', () => {
    beforeEach(() => {
      mockedIsDependencyInCwd.mockReturnValue(true);
    });

    it('runs the command', async () => {
      await run('root-level');

      expect(exitMock).not.toHaveBeenCalled();
    });
  });
});
