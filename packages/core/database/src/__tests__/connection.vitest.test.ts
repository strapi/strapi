import { describe, it, expect, vi } from 'vitest';
import type { Knex } from 'knex';

import { createConnection } from '../connection';

type AfterCreate = (conn: unknown, done: (err: Error | null, conn: unknown) => void) => void;

const passThrough: AfterCreate = (conn, done) => done(null, conn);

const createUserConfig = (afterCreate: AfterCreate): Knex.Config => ({
  client: 'sqlite',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
  pool: { min: 0, max: 1, afterCreate },
});

describe('createConnection', () => {
  it('does not write the strapi afterCreate wrapper into the pool config it was given', async () => {
    const userAfterCreate = vi.fn(passThrough);
    const userConfig = createUserConfig(userAfterCreate);

    const connection = createConnection(userConfig, { pool: { afterCreate: passThrough } });

    expect(userConfig.pool?.afterCreate).toBe(userAfterCreate);

    await connection.destroy();
  });

  it('runs only its own strapi afterCreate when several connections share one config', async () => {
    const userAfterCreate = vi.fn(passThrough);
    const firstStrapiAfterCreate = vi.fn(passThrough);
    const secondStrapiAfterCreate = vi.fn(passThrough);
    const userConfig = createUserConfig(userAfterCreate);

    const first = createConnection(userConfig, { pool: { afterCreate: firstStrapiAfterCreate } });
    const second = createConnection(userConfig, { pool: { afterCreate: secondStrapiAfterCreate } });

    await second.raw('SELECT 1');

    expect(secondStrapiAfterCreate).toHaveBeenCalledTimes(1);
    expect(firstStrapiAfterCreate).not.toHaveBeenCalled();
    expect(userAfterCreate).toHaveBeenCalledTimes(1);

    await first.destroy();
    await second.destroy();
  });
});
