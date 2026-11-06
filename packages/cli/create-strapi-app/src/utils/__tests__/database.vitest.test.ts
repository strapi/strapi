import { describe, expect, it } from 'vitest';

import { getDatabaseInfos } from '../database';
import { generateDotEnv } from '../dot-env';

import type { Options, Scope } from '../../types';

const getDotEnvFilename = async (options: Options) => {
  const database = await getDatabaseInfos(options);
  const dotEnv = generateDotEnv({ database } as Scope);

  return dotEnv.match(/^DATABASE_FILENAME=(.*)$/m)?.[1];
};

describe('getDatabaseInfos', () => {
  it('uses the default sqlite file in non-interactive mode without database options', async () => {
    await expect(getDotEnvFilename({ nonInteractive: true })).resolves.toBe('.tmp/data.db');
  });

  it('uses the default sqlite file when --dbclient sqlite is passed without --dbfile', async () => {
    await expect(getDotEnvFilename({ nonInteractive: true, dbclient: 'sqlite' })).resolves.toBe(
      '.tmp/data.db'
    );
  });

  it('keeps the --dbfile value when it is passed with --dbclient sqlite', async () => {
    await expect(
      getDotEnvFilename({ nonInteractive: true, dbclient: 'sqlite', dbfile: 'db/custom.db' })
    ).resolves.toBe('db/custom.db');
  });
});
