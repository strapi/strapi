import path from 'path';
import fse from 'fs-extra';

import { enterprisePluginCatalog } from '../catalog';
import { isPluginConfigured, printConfigurationHints } from '../configuration-hints';
import { createTemporaryDirectory, createTestLogger } from './test-helpers';

const [aiByokEntry] = enterprisePluginCatalog;

const createAppWithPluginsConfig = async (content: string, fileName = 'plugins.ts') => {
  const appDir = await createTemporaryDirectory();
  await fse.outputFile(path.join(appDir, 'config', fileName), content);
  return appDir;
};

describe('isPluginConfigured', () => {
  it('finds the plugin key in config/plugins.ts or config/plugins.js', async () => {
    const tsApp = await createAppWithPluginsConfig(
      "export default ({ env }) => ({ 'ai-byok': { config: {} } });"
    );
    const jsApp = await createAppWithPluginsConfig(
      'module.exports = () => ({ "ai-byok": {} });',
      'plugins.js'
    );

    await expect(isPluginConfigured(tsApp, 'ai-byok')).resolves.toBe(true);
    await expect(isPluginConfigured(jsApp, 'ai-byok')).resolves.toBe(true);
  });

  it('is false when the key is missing or there is no config/plugins file', async () => {
    const otherPluginApp = await createAppWithPluginsConfig(
      'export default () => ({ upload: {} });'
    );

    await expect(isPluginConfigured(otherPluginApp, 'ai-byok')).resolves.toBe(false);
    await expect(isPluginConfigured(await createTemporaryDirectory(), 'ai-byok')).resolves.toBe(
      false
    );
  });
});

describe('printConfigurationHints', () => {
  it('prints the config block and the .env lines, without writing any file', async () => {
    const appDir = await createTemporaryDirectory();
    const logger = createTestLogger();

    await printConfigurationHints({ appDir, entries: [aiByokEntry], logger });

    const [printedHint] = logger.info.mock.calls[0] as [string];
    expect(printedHint).toContain(
      'AI BYOK is installed, and Strapi will not start until it is configured.'
    );
    expect(printedHint).toContain("enabled: env.bool('STRAPI_AI_BYOK_ENABLED', false),");
    expect(printedHint).toMatch(/^ {2}STRAPI_AI_BYOK_ENABLED=true$/m);
    expect(printedHint).toContain("apiKey: env('STRAPI_AI_PROVIDER_API_KEY')");
    expect(printedHint).toMatch(/^ {2}STRAPI_AI_PROVIDER_BASE_URL=$/m);
    expect(await fse.readdir(appDir)).toEqual([]);
  });

  it('says the plugin is already configured instead of printing the block', async () => {
    const appDir = await createAppWithPluginsConfig("export default () => ({ 'ai-byok': {} });");
    const logger = createTestLogger();

    await printConfigurationHints({ appDir, entries: [aiByokEntry], logger });

    expect(logger.info).toHaveBeenCalledWith('AI BYOK is already configured in config/plugins.');
  });
});
