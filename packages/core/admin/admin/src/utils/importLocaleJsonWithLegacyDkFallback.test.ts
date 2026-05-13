import { importLocaleJsonWithLegacyDkFallback } from './importLocaleJsonWithLegacyDkFallback';

describe('importLocaleJsonWithLegacyDkFallback', () => {
  it('returns primary locale data when import succeeds', async () => {
    const data = await importLocaleJsonWithLegacyDkFallback('fr', async () => ({
      default: { hello: 'world' },
    }));

    expect(data).toEqual({ hello: 'world' });
  });

  it('falls back from da to dk when da fails', async () => {
    const data = await importLocaleJsonWithLegacyDkFallback('da', async (code) => {
      if (code === 'da') {
        throw new Error('no da');
      }

      return { default: { legacy: '1' } };
    });

    expect(data).toEqual({ legacy: '1' });
  });

  it('returns empty object when da and dk both fail', async () => {
    const data = await importLocaleJsonWithLegacyDkFallback('da', async () => {
      throw new Error('fail');
    });

    expect(data).toEqual({});
  });
});
