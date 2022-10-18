'use strict';

const { Command } = require('commander');
const path = require('path');
const { runCommand } = require('../index');

const makeArgv = (...args) => {
  return ['node', path.resolve(__dirname, __filename), ...args];
};

describe('strapi command', () => {
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  // const exit = jest.fn();
  const stdoutWrite = jest.fn();
  const writeOut = jest.fn();
  const writeErr = jest.fn();
  let command;

  beforeEach(() => {
    command = new Command();
    exit.mockReset();
    stdoutWrite.mockReset();
    command.exitOverride();
    command.configureOutput({
      writeOut,
      writeErr,
    });
  });

  it('throws on invalid command', async () => {
    const cmd = 'wrongCommand';
    const errString = `error: unknown command '${cmd}'`;
    expect(async () => {
      await runCommand(makeArgv(cmd), command);
    }).rejects.toThrow(errString);

    expect(writeErr).toHaveBeenCalled();

    // trim to ignore newlines
    expect(writeErr.mock.calls[0][0].trim()).toEqual(errString);
  });

  it('--version outputs version', async () => {
    await runCommand(makeArgv('version'), command);

    expect(exit).toHaveBeenCalledWith(0);
  });
});
