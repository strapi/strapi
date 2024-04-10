import path from 'path';
import fs from 'fs';
import { loadConfigFile } from '../utils/load-config-file';

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
  // TODO: it would be better to move these out of the root config and allow them to be loaded
  'launchedAt',
  'serveAdminPanel',
  'autoReload',
  'environment',
  'packageJsonStrapi',
  'info',
  'autoReload',
  'dirs',

  // probably mistaken/typo filenames
  ...Object.keys(MISTAKEN_FILENAMES),
];

// Existing Strapi configuration files
const STRAPI_CONFIG_FILENAMES = [
  'admin',
  'server',
  'api',
  'database',
  'middlewares',
  'plugins',
  'features',
];

// Note: we don't have access to strapi logger at this point so we can't use it
const logWarning = (message: string) => {
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

    if (!VALID_EXTENSIONS.includes(extensionLower)) {
      logWarning(
        `Config file not loaded, extension must be one of ${VALID_EXTENSIONS.join(',')}): ${
          file.name
        }`
      );
      return acc;
    }

    if (RESTRICTED_FILENAMES.includes(baseNameLower)) {
      logWarning(`Config file not loaded, restricted filename: ${file.name}`);

      // suggest the filename they probably meant
      if (baseNameLower in MISTAKEN_FILENAMES) {
        console.log(
          `Did you mean ${MISTAKEN_FILENAMES[baseNameLower as keyof typeof MISTAKEN_FILENAMES]}]} ?`
        );
      }

      return acc;
    }

    // restricted names and Strapi configs are also restricted from being prefixes
    const restrictedPrefix = [...RESTRICTED_FILENAMES, ...STRAPI_CONFIG_FILENAMES].find(
      (restrictedName) =>
        restrictedName.startsWith(baseNameLower) && restrictedName !== baseNameLower
    );
    if (restrictedPrefix) {
      logWarning(
        `Config file not loaded, filename cannot start with ${restrictedPrefix}: ${file.name}`
      );
    }

    /**
     *  Note: If user config files contain non-alpha-numeric characters, we won't be able to auto-load env
     * into them.
     *
     * For the initial feature, we will only load our internal configs, but later when we provide a method
     * to define the shape of custom configs, we will need to warn that those filenames can't be loaded
     * for technical limitations on env variable names
     *  */
    // if (!/^[A-Za-z0-9]+$/.test(baseName)) {
    //   logWarning("Using a non-alphanumeric config file name prevents Strapi from auto-loading it from environment variables.")
    // }

    // filter filenames without case-insensitive uniqueness
    if (seenFilenames.has(baseNameLower)) {
      logWarning(
        `Config file not loaded, case-insensitive name matches other config file: ${file.name}`
      );
      return acc;
    }
    seenFilenames.add(baseNameLower);

    // If file passes all filters, add it to the accumulator
    acc.push(file);
    return acc;
  }, [] as fs.Dirent[]);

  return configFiles.reduce(
    (acc, file) => {
      const key = path.basename(file.name, path.extname(file.name));

      acc[key] = loadConfigFile(path.resolve(dir, file.name));

      return acc;
    },
    {} as Record<string, unknown>
  );
};
