import { printSetupLinks, readSetupLink } from '../setup-links';
import { createTemporaryDirectory, createTestLogger, installFakePackage } from './test-helpers';

const AI_BYOK = '@strapi-enterprise/plugin-ai-byok';
const OTHER_PLUGIN = '@strapi-enterprise/plugin-other';
const AI_WORKFLOWS = '@strapi-enterprise/ai-workflows';

describe('readSetupLink', () => {
  it('uses the homepage of the installed version', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, AI_BYOK, {
      version: '1.0.0',
      homepage: 'https://docs.strapi.io/cms/plugins/ai-byok',
      strapi: { kind: 'plugin', displayName: 'AI BYOK' },
    });

    await expect(readSetupLink(appDir, AI_BYOK)).resolves.toEqual({
      displayName: 'AI BYOK',
      url: 'https://docs.strapi.io/cms/plugins/ai-byok',
    });
  });

  it('falls back to the Strapi documentation and the package name', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, AI_BYOK, { version: '1.0.0', strapi: { kind: 'plugin' } });

    await expect(readSetupLink(appDir, AI_BYOK)).resolves.toEqual({
      displayName: AI_BYOK,
      url: 'https://docs.strapi.io/',
    });
  });

  it('links any kind of package, such as a provider', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, '@strapi-enterprise/provider-upload-s3', {
      version: '1.0.0',
      homepage: 'https://docs.strapi.io/cms/providers/s3',
      strapi: { kind: 'provider', displayName: 'S3 Upload' },
    });

    await expect(readSetupLink(appDir, '@strapi-enterprise/provider-upload-s3')).resolves.toEqual({
      displayName: 'S3 Upload',
      url: 'https://docs.strapi.io/cms/providers/s3',
    });
  });

  it('is undefined for a library or a package that is not installed', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, AI_WORKFLOWS, { version: '0.1.0' });

    await expect(readSetupLink(appDir, AI_WORKFLOWS)).resolves.toBeUndefined();
    await expect(readSetupLink(appDir, AI_BYOK)).resolves.toBeUndefined();
  });
});

describe('printSetupLinks', () => {
  it('prints one line per installed plugin, and none for libraries', async () => {
    const appDir = await createTemporaryDirectory();
    const logger = createTestLogger();
    await installFakePackage(appDir, AI_BYOK, {
      version: '1.0.0',
      homepage: 'https://docs.strapi.io/cms/plugins/ai-byok',
      strapi: { kind: 'plugin', displayName: 'AI BYOK' },
    });
    await installFakePackage(appDir, OTHER_PLUGIN, {
      version: '1.0.0',
      homepage: 'https://docs.strapi.io/cms/plugins/other',
      strapi: { kind: 'plugin', displayName: 'Other' },
    });
    await installFakePackage(appDir, AI_WORKFLOWS, { version: '0.1.0' });

    await printSetupLinks({
      appDir,
      packageNames: [AI_BYOK, OTHER_PLUGIN, AI_WORKFLOWS],
      logger,
    });

    expect(logger.info.mock.calls).toEqual([
      ['AI BYOK: visit https://docs.strapi.io/cms/plugins/ai-byok to set it up.'],
      ['Other: visit https://docs.strapi.io/cms/plugins/other to set it up.'],
    ]);
  });
});
