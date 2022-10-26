'use strict';

const { Command } = require('commander');
const path = require('path');
const { runStrapiCommand } = require('../index');

const makeArgv = (...args) => {
  return ['node', path.resolve(__dirname, __filename), ...args];
};

describe('strapi command', () => {
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  const stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
  const stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
  const commanderWriteOut = jest.fn();
  const commanderWriteErr = jest.fn();
  let command;

  beforeEach(() => {
    command = new Command();
    exit.mockReset();
    stdoutWrite.mockReset();
    stderrWrite.mockReset();
    commanderWriteOut.mockReset();
    commanderWriteErr.mockReset();

    // Add mocks for commander output, which we can't control
    command.configureOutput({
      writeOut: commanderWriteOut,
      writeErr: commanderWriteErr,
    });
  });

  it('throws on invalid command', async () => {
    const cmd = 'wrongCommand';
    const errString = `error: unknown command '${cmd}'`;

    await runStrapiCommand(makeArgv(cmd), command);

    expect(exit).toHaveBeenCalledWith(1);

    // trim to ignore newlines
    expect(commanderWriteErr).toHaveBeenCalledTimes(1);
    expect(commanderWriteErr.mock.calls[0][0].trim()).toEqual(errString);
  });

  it('--version outputs version', async () => {
    await runStrapiCommand(makeArgv('version'), command);

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    expect(stdoutWrite.mock.calls[0][0].trim()).toEqual(require('../../../package.json').version);
    expect(exit).toHaveBeenCalledWith(0);
  });
});
