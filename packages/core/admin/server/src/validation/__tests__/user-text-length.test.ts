/* eslint-env jest */

/**
 * Admin user `email`, `firstname`, `lastname` and `username` are stored in varchar(255) columns.
 * Without a max length the database rejected longer values on PostgreSQL and MySQL, and the admin
 * got a 500 instead of a validation error.
 */
import {
  validateUserCreationInput,
  validateProfileUpdateInput,
  validateUserUpdateInput,
} from '../user';
import {
  validateAdminRegistrationInput,
  validateRegistrationInput,
} from '../authentication/register';

const tooLong = 'a'.repeat(256);
const atLimit = 'a'.repeat(255);
// A valid address of 256 characters
const tooLongEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.test`;
const password = 'Testing123';

const rejectsPath = (path: string[]) =>
  expect.objectContaining({
    name: 'ValidationError',
    details: { errors: [expect.objectContaining({ path })] },
  });

describe('Admin user text length', () => {
  test('the long email used below is 256 characters', () => {
    expect(tooLongEmail).toHaveLength(256);
  });

  describe('user creation', () => {
    const base = { email: 'kai@example.com', firstname: 'Kai', lastname: 'Doe', roles: [1] };

    test.each(['firstname', 'lastname'])('rejects a %s longer than 255 characters', async (key) => {
      await expect(validateUserCreationInput({ ...base, [key]: tooLong })).rejects.toEqual(
        rejectsPath([key])
      );
    });

    test('rejects an email longer than 255 characters', async () => {
      await expect(validateUserCreationInput({ ...base, email: tooLongEmail })).rejects.toEqual(
        rejectsPath(['email'])
      );
    });

    test('accepts a firstname and lastname of 255 characters', async () => {
      await expect(
        validateUserCreationInput({ ...base, firstname: atLimit, lastname: atLimit })
      ).resolves.toBeDefined();
    });
  });

  describe.each([
    ['profile update', validateProfileUpdateInput],
    ['user update', validateUserUpdateInput],
  ] as const)('%s', (_, validate) => {
    test.each(['firstname', 'lastname', 'username'])(
      'rejects a %s longer than 255 characters',
      async (key) => {
        await expect(validate({ [key]: tooLong })).rejects.toEqual(rejectsPath([key]));
      }
    );

    test('rejects an email longer than 255 characters', async () => {
      await expect(validate({ email: tooLongEmail })).rejects.toEqual(rejectsPath(['email']));
    });

    test('accepts a firstname, lastname and username of 255 characters', async () => {
      await expect(
        validate({ firstname: atLimit, lastname: atLimit, username: atLimit })
      ).resolves.toBeDefined();
    });
  });

  describe('first admin registration', () => {
    const base = { email: 'kai@example.com', firstname: 'Kai', lastname: 'Doe', password };

    test.each(['firstname', 'lastname'])('rejects a %s longer than 255 characters', async (key) => {
      await expect(validateAdminRegistrationInput({ ...base, [key]: tooLong })).rejects.toEqual(
        rejectsPath([key])
      );
    });

    test('rejects an email longer than 255 characters', async () => {
      await expect(
        validateAdminRegistrationInput({ ...base, email: tooLongEmail })
      ).rejects.toEqual(rejectsPath(['email']));
    });
  });

  describe('registration with an invitation', () => {
    test.each(['firstname', 'lastname'])('rejects a %s longer than 255 characters', async (key) => {
      await expect(
        validateRegistrationInput({
          registrationToken: 'token',
          userInfo: { firstname: 'Kai', password, [key]: tooLong },
        })
      ).rejects.toEqual(rejectsPath(['userInfo', key]));
    });
  });
});
