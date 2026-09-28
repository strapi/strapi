import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import type { EnterprisePluginCatalogEntry } from './catalog';

const PLUGIN_CONFIG_FILES = ['plugins.ts', 'plugins.js', 'plugins.mjs', 'plugins.cjs'];

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when `config/plugins` already has a key for this plugin. */
export const isPluginConfigured = async (appDir: string, pluginId: string): Promise<boolean> => {
  const pluginKeyPattern = new RegExp(`['"\`]${escapeForRegExp(pluginId)}['"\`]\\s*:`);

  for (const configFileName of PLUGIN_CONFIG_FILES) {
    const configFilePath = path.join(appDir, 'config', configFileName);

    if (await fse.pathExists(configFilePath)) {
      if (pluginKeyPattern.test(await fse.readFile(configFilePath, 'utf8'))) {
        return true;
      }
    }
  }

  return false;
};

const indent = (text: string) =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

export const formatConfigurationHint = (
  entry: EnterprisePluginCatalogEntry
): string | undefined => {
  if (!entry.configuration) {
    return undefined;
  }

  return [
    // Strapi enables an installed plugin, so it fails to start until the plugin is configured.
    `${entry.displayName} is installed, and Strapi will not start until it is configured.`,
    '',
    'Add this to config/plugins:',
    '',
    indent(entry.configuration.pluginConfig),
    '',
    'And set these in .env:',
    '',
    indent(entry.configuration.envLines.join('\n')),
    '',
  ].join('\n');
};

/**
 * Prints the configuration each installed plugin needs. Nothing is written: `config/plugins` can be
 * any shape of JavaScript or TypeScript, so the user adds the block.
 */
export const printConfigurationHints = async ({
  appDir,
  entries,
  logger,
}: {
  appDir: string;
  entries: EnterprisePluginCatalogEntry[];
  logger: Logger;
}): Promise<void> => {
  for (const entry of entries) {
    const configurationHint = formatConfigurationHint(entry);

    if (!configurationHint) {
      continue;
    }

    if (await isPluginConfigured(appDir, entry.pluginId)) {
      logger.info(`${entry.displayName} is already configured in config/plugins.`);
      continue;
    }

    logger.info(configurationHint);
  }
};
