import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDatabaseInfos } from '../database';
import { generateDotEnv } from '../dot-env';

import type { Options, Scope } from '../../types';

const prompt = vi.hoisted(() => vi.fn());

vi.mock('inquirer', () => ({ default: { prompt } }));

const getDotEnvFilename = async (options: Options) => {
  const database = await getDatabaseInfos(options);
  const dotEnv = generateDotEnv({ database } as Scope);

  return dotEnv.match(/^DATABASE_FILENAME=(.*)$/m)?.[1];
};

describe('getDatabaseInfos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    prompt.mockReset();
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

  it.each([
    ['non-interactive', { nonInteractive: true }],
    ['--quickstart', { quickstart: true }],
    ['interactive', {}],
  ])(
    'keeps a lone --dbfile as a sqlite file without --dbclient (%s)',
    async (_mode, modeOptions) => {
      const database = await getDatabaseInfos({ ...modeOptions, dbfile: 'db/custom.db' });

      expect(database).toEqual(
        expect.objectContaining({
          client: 'sqlite',
          connection: expect.objectContaining({ filename: 'db/custom.db' }),
        })
      );
      expect(prompt).not.toHaveBeenCalled();
    }
  );

  it.each(['', '   '])(
    'uses the default sqlite file when a lone --dbfile is empty (%j)',
    async (dbfile) => {
      await expect(getDotEnvFilename({ nonInteractive: true, dbfile })).resolves.toBe(
        '.tmp/data.db'
      );
    }
  );

  it('still asks for the database interactively without any database option', async () => {
    prompt.mockResolvedValueOnce({ useDefault: true });

    await expect(getDatabaseInfos({})).resolves.toEqual(
      expect.objectContaining({ client: 'sqlite' })
    );
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('still fails when --dbfile comes with network flags but no --dbclient', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    await expect(
      getDatabaseInfos({ nonInteractive: true, dbhost: 'localhost', dbfile: 'db/custom.db' })
    ).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Required database arguments are missing')
    );
  });
});
