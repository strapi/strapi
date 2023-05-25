'use strict';

const expectExit = async (code, fn) => {
  const exit = jest.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error(`process.exit: ${number}`);
  });
  await expect(async () => {
    await fn();
  }).rejects.toThrow('process.exit');
  expect(exit).toHaveBeenCalledWith(code);
  exit.mockRestore();
};

module.exports = {
  expectExit,
};
