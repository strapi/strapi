import bcrypt from 'bcryptjs';
import type { Core } from '@strapi/types';

import { TEST_PASSWORD } from './permissions';

const USER_UID = 'plugin::end-users.user';
const ACCOUNT_UID = 'plugin::end-users.account';

/**
 * The plugin config of an instance with the Users & Permissions compatibility mode on. `overrides`
 * is merged over the `compat` group, key by key at the top level of the group.
 */
export const compatConfig = (overrides: Record<string, unknown> = {}) => ({
  compat: { usersPermissions: true, ...overrides },
});

export interface SeedUpUserOptions {
  email: string;
  username?: string;
  password?: string;
  /** `false` leaves the user without a credential account (an account that signs in elsewhere). */
  credential?: boolean;
  /** `bcrypt` stores a hash the way Users & Permissions did; the default is the engine's own. */
  hash?: 'engine' | 'bcrypt';
  confirmed?: boolean;
  blocked?: boolean;
}

export interface SeededUpUser {
  /** The numeric id, which is what the compat payloads show next to `documentId`. */
  id: number;
  documentId: string;
  email: string;
  username: string | null;
  password: string;
}

/**
 * Creates an end user through the Document Service, with a credential account whose hash is built
 * here at run time (never a literal in the source).
 */
export const seedUpUser = async (
  strapi: Core.Strapi,
  opts: SeedUpUserOptions
): Promise<SeededUpUser> => {
  const password = opts.password ?? TEST_PASSWORD;

  const user = (await strapi.documents(USER_UID as never).create({
    data: {
      email: opts.email,
      username: opts.username ?? null,
      name: opts.email.split('@')[0],
      emailVerified: opts.confirmed ?? true,
      banned: opts.blocked ?? false,
    } as never,
  })) as unknown as { id: number; documentId: string };

  if (opts.credential !== false) {
    const hash =
      opts.hash === 'bcrypt'
        ? bcrypt.hashSync(password, 4)
        : await strapi.plugin('end-users').service('engine').get().hashPassword(password);

    await strapi.documents(ACCOUNT_UID as never).create({
      data: {
        userId: user.documentId,
        providerId: 'credential',
        accountId: user.documentId,
        password: hash,
      } as never,
    });
  }

  return {
    id: user.id,
    documentId: user.documentId,
    email: opts.email,
    username: opts.username ?? null,
    password,
  };
};
