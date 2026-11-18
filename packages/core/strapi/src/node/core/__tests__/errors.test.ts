import { errors, yup } from '@strapi/utils';

import { handleUnexpectedError } from '../errors';

/**
 * `handleUnexpectedError` prints the stack, then a `Details:` box with every issue of a
 * validation error, then exits.
 */
const run = (error: unknown) => {
  const logs: string[] = [];
  const log = jest.spyOn(console, 'log').mockImplementation((...args) => {
    logs.push(args.join(' '));
  });
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

  handleUnexpectedError(error);

  expect(exit).toHaveBeenCalledWith(1);
  log.mockRestore();
  consoleError.mockRestore();
  exit.mockRestore();

  return logs.join('\n');
};

const yupError = (input: unknown) => {
  try {
    yup
      .object({ name: yup.string().required(), age: yup.number() })
      .validateSync(input, { strict: true, abortEarly: false });
  } catch (error) {
    return new errors.YupValidationError(error as yup.ValidationError);
  }

  throw new Error('expected the yup schema to reject the input');
};

describe('handleUnexpectedError', () => {
  test('prints every issue of a yup validation error with its value', () => {
    const output = run(yupError({ age: 'old' }));

    expect(output).toContain('Details:');
    expect(output).toContain('message: name is a required field');
    expect(output).toContain('message: age must be a `number` type');
    expect(output).toContain('value: old');
  });

  test('prints only the value of a yup validation error with one issue', () => {
    const output = run(yupError({ name: 'a', age: 'old' }));

    expect(output).toContain('Details:');
    expect(output).toContain('value: old');
    expect(output).not.toContain('message:');
  });

  test('prints no details for an error that is not a validation error', () => {
    const output = run(new Error('boom'));

    expect(output).toContain('boom');
    expect(output).not.toContain('Details:');
  });
});
