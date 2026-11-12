import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDatabaseInfos } from '../database';
import { generateDotEnv } from '../dot-env';

import type { Options, Scope } from '../../types';

const getDotEnvFilename = async (options: Options) => {
  const database = await getDatabaseInfos(options);
  const dotEnv = generateDotEnv({ database } as Scope);

  return dotEnv.match(/^DATABASE_FILENAME=(.*)$/m)?.[1];
};

describe('getDatabaseInfos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it.each(['', '   '])(
    'uses the default sqlite file when --dbfile is empty (%j) with --dbclient sqlite',
    async (dbfile) => {
      await expect(
        getDotEnvFilename({ nonInteractive: true, dbclient: 'sqlite', dbfile })
      ).resolves.toBe('.tmp/data.db');
    }
  );

  it('fails instead of ignoring --dbfile when --dbclient is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    await expect(
      getDatabaseInfos({ nonInteractive: true, dbfile: 'db/custom.db' })
    ).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Please specify the database client')
    );
  });
});
