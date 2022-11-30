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
  const commanderWriteOut = jest.fn();
  const commanderWriteErr = jest.fn();
  let command;

  beforeEach(() => {
    jest.clearAllMocks();

    command = new Command();
    // Add mocks for commander output, which we can't control
    command.configureOutput({
      writeOut: commanderWriteOut,
      writeErr: commanderWriteErr,
    });
  });

  it('displays an error on invalid command', async () => {
    const cmd = 'wrongCommand';

    await runStrapiCommand(makeArgv(cmd), command);

    expect(exit).toHaveBeenCalledWith(1);

    expect(commanderWriteErr).toHaveBeenCalledTimes(1);
    // trim to ignore newlines
    expect(commanderWriteErr.mock.calls[0][0]).toContain(cmd);
    expect(commanderWriteErr.mock.calls[0][0]).toContain('error');
  });

  it('--version outputs version', async () => {
    await runStrapiCommand(makeArgv('version'), command);

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    // trim to ignore newlines
    expect(stdoutWrite.mock.calls[0][0].trim()).toEqual(require('../../../package.json').version);
    expect(exit).toHaveBeenCalledWith(0);
  });
});
