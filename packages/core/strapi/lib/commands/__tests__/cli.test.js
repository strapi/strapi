'use strict';

const { Command } = require('commander');
const path = require('path');
const { runCommand } = require('../index');

const makeArgv = (...args) => {
  return ['node', path.resolve(__dirname, __filename), ...args];
};

/**
 * Catch Commander errors and send them to the process arg instead of current node process
 * @param {CommanderError} commanderError
 */
// command.exitOverride((commanderError) => {
//   console.log('would exit with', commanderError.exitCode);
//   // nodeProcess.exit(commanderError.code);
// });

describe('strapi command', () => {
  const exit = jest.fn();
  const stdoutWrite = jest.fn();
  let command;

  beforeEach(() => {
    command = new Command();
    exit.mockReset();
    stdoutWrite.mockReset();
    command.exitOverride(() => {
      console.log('OVERRIDE');
    });
    command.exitOverride();
  });

  it('throws on invalid command', async () => {
    expect(async () => {
      await runCommand(
        {
          // ...process,
          argv: makeArgv('verssaion'),
          exit,
          stdout: {
            write: stdoutWrite,
          },
        },
        command
      );
    }).rejects.toThrow();
  });

  it('--version outputs version', async () => {
    await runCommand(
      {
        // ...process,
        argv: makeArgv('version'),
        exit,
        stdout: {
          write: stdoutWrite,
        },
      },
      command
    );

    expect(exit).toHaveBeenCalledWith(0);
  });
});
