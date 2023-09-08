import type { Utils } from '@strapi/typings';

const expectExit = async (code: number, fn: Utils.Function.Any) => {
  const exit = jest.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error(`process.exit: ${number}`);
  });
  await expect(async () => {
    await fn();
  }).rejects.toThrow('process.exit');
  expect(exit).toHaveBeenCalledWith(code);
  exit.mockRestore();
};

export { expectExit };
