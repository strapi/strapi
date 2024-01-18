import path from 'path';
import fs from 'fs';
import { loadFile } from './load-config-file';

const VALID_EXTENSIONS = ['.js', '.json'];

// These filenames are restricted, but will also emit a warning that the filename is probably a mistake
const MISTAKEN_FILENAMES = {
  middleware: 'middlewares',
  plugin: 'plugins',
};

// the following are restricted to prevent conflicts with existing STRAPI_* env vars or root level config options
// must all be lowercase to match validator
const RESTRICTED_FILENAMES = [
  // existing env vars
  'uuid',
  'hosting',
  'license',
  'enforce',
  'disable',
  'enable',
  'telemetry',

  // reserved for future internal use
  'strapi',
  'internal',

  // root level config options
  // TODO: these might be better out of root config
  'launchedAt',
  'serveAdminPanel',
  'autoReload',
  'environment',
  'packageJsonStrapi',
  'info',
  'autoReload',

  // probably mistaken/typo filenames
  ...Object.keys(MISTAKEN_FILENAMES),
];

const warnSkippedConfig = (message: string) => {
  console.warn(message);
};

export default (dir: string) => {
  if (!fs.existsSync(dir)) return {};

  const allFiles = fs.readdirSync(dir, { withFileTypes: true });
  const seenFilenames = new Set<string>();
  const configFiles = allFiles.reduce((acc, file) => {
    const baseName = path.basename(file.name, path.extname(file.name));
    const baseNameLower = baseName.toLowerCase();
    const extension = path.extname(file.name);
    const extensionLower = extension.toLowerCase();

    if (!file.isFile()) {
      return acc;
    }

    // Note: we don't have access to strapi logger at this point so we can't check if
    if (!VALID_EXTENSIONS.includes(extensionLower)) {
      warnSkippedConfig(
        `Config file not loaded, extension must be one of ${VALID_EXTENSIONS.join(',')}): ${
          file.name
        }`
      );
      return acc;
    }

    if (RESTRICTED_FILENAMES.includes(baseNameLower)) {
      warnSkippedConfig(`Config file not loaded, restricted filename: ${file.name}`);

      // suggest the filename they probably meant
      if (baseNameLower in MISTAKEN_FILENAMES) {
        console.log(
          `Did you mean ${MISTAKEN_FILENAMES[baseNameLower as keyof typeof MISTAKEN_FILENAMES]}]} ?`
        );
      }

      return acc;
    }

    // filter filenames with non-alphanumberic characters
    // because underscore (_) is reserved as a separator for use when loading env vars into config
    if (!/^[A-Za-z0-9]+$/.test(baseName)) {
      warnSkippedConfig(
        `Config file not loaded, includes non-alphanumeric characters: ${file.name}`
      );
      return acc;
    }

    // filter filenames without case-insensitive uniqueness
    if (seenFilenames.has(baseNameLower)) {
      warnSkippedConfig(
        `Config file not loaded, case-insensitive name matches other config file: ${file.name}`
      );
      return acc;
    }
    seenFilenames.add(baseNameLower);

    // If file passes all filters, add it to the accumulator
    acc.push(file);
    return acc;
  }, [] as fs.Dirent[]);

  return configFiles.reduce((acc, file) => {
    const key = path.basename(file.name, path.extname(file.name));

    acc[key] = loadFile(path.resolve(dir, file.name));

    return acc;
  }, {} as Record<string, unknown>);
};
