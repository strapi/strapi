import { getInquirer } from '../../../utils/get-inquirer';
import type { EnterprisePluginEntry } from './discovery';
import { resolvePluginStatus } from './plugin-status';
import type { PackumentLookup } from './registry';
import { isPrerelease } from './versions';

export type PluginRowState =
  /** Installed, and a newer compatible version exists. Selected by default. */
  | 'upgrade'
  /** Not installed, and the license includes it. */
  | 'install'
  /** Installed and up to date for this Strapi version. */
  | 'installed'
  /** Installed, but the license does not include it anymore. */
  | 'not-licensed'
  /** Not installed, and no stable version fits this Strapi version. */
  | 'no-compatible-version'
  /** Not installed, and only prerelease versions exist. */
  | 'no-stable-release'
  /** Not installed, and not available to this license: not shown. */
  | 'hidden';

export interface PluginRow {
  entry: EnterprisePluginEntry;
  state: PluginRowState;
  installedVersion?: string;
  targetVersion?: string;
  note?: string;
  /** For a plugin with no version for this app: the Strapi range its newest version requires. */
  requiredStrapiRange?: string;
}

export const buildPluginRow = ({
  entry,
  lookup,
  installedVersion,
  strapiVersion,
}: {
  entry: EnterprisePluginEntry;
  lookup: PackumentLookup;
  installedVersion?: string;
  strapiVersion?: string;
}): PluginRow => {
  const status = resolvePluginStatus({ lookup, installedVersion, strapiVersion });

  switch (status.state) {
    case 'install':
      return { entry, state: 'install', targetVersion: status.targetVersion, note: status.note };
    case 'upgrade':
    case 'installed':
      return { entry, ...status, installedVersion };
    case 'not-licensed':
      return installedVersion
        ? { entry, state: 'not-licensed', installedVersion }
        : { entry, state: 'hidden' };
    case 'not-found':
      return { entry, state: 'hidden', installedVersion };
    default:
      // No version for this app. An installed plugin stays listed as installed.
      if (installedVersion) {
        return {
          entry,
          state: 'installed',
          installedVersion,
          note: status.state === 'no-compatible-version' ? status.note : undefined,
        };
      }

      return status.state === 'no-compatible-version'
        ? {
            entry,
            state: 'no-compatible-version',
            note: `requires Strapi ${status.requiredStrapiRange}`,
            requiredStrapiRange: status.requiredStrapiRange,
          }
        : { entry, state: 'no-stable-release' };
  }
};

const ROW_ORDER: PluginRowState[] = [
  'upgrade',
  'install',
  'installed',
  'not-licensed',
  'no-compatible-version',
  'no-stable-release',
];

export const isSelectable = (row: PluginRow): boolean =>
  row.state === 'upgrade' || row.state === 'install';

export const toInstallSpec = (row: PluginRow): string =>
  `${row.entry.packageName}@${row.targetVersion}`;

interface CheckboxChoice {
  name: string;
  value?: string;
  checked?: boolean;
  disabled?: string;
}

export const toCheckboxChoice = (row: PluginRow): CheckboxChoice => {
  const { displayName, packageName, kind } = row.entry;
  const kindTag = kind && kind !== 'plugin' ? ` [${kind}]` : '';
  const label = `${displayName} (${packageName})${kindTag}`;
  // The note is a sentence of its own, such as "1.3.0 is available but requires Strapi ^5.56.0."
  const noteSuffix = row.note ? `  ${row.note}` : '';

  switch (row.state) {
    case 'upgrade': {
      // Replacing a prerelease with the stable release can be a step back, so it is only offered.
      const replacesPrerelease =
        row.installedVersion !== undefined && isPrerelease(row.installedVersion);

      return {
        name: `${label}  ${row.installedVersion} → ${row.targetVersion} ${replacesPrerelease ? '[stable release]' : '[upgrade]'}${noteSuffix}`,
        value: toInstallSpec(row),
        checked: !replacesPrerelease,
      };
    }
    case 'install':
      return {
        name: `${label}  ${row.targetVersion}  ${row.entry.summary}${noteSuffix}`,
        value: toInstallSpec(row),
        checked: false,
      };
    case 'installed':
      return {
        name: `${label}  ${row.installedVersion}`,
        disabled: row.note ? `installed, ${row.note}` : 'installed',
      };
    case 'not-licensed':
      return { name: `${label}  ${row.installedVersion}`, disabled: 'not in your license' };
    case 'no-compatible-version':
      return { name: label, disabled: row.note ?? 'no compatible version' };
    case 'no-stable-release':
      return { name: label, disabled: 'no stable release yet' };
    default:
      return { name: label, disabled: 'unavailable' };
  }
};

/** Visible rows, with upgrades first. Unticking a row never uninstalls anything. */
export const orderVisibleRows = (rows: PluginRow[]): PluginRow[] =>
  rows
    .filter((row) => row.state !== 'hidden')
    .sort((left, right) => ROW_ORDER.indexOf(left.state) - ROW_ORDER.indexOf(right.state));

export const promptForPlugins = async (rows: PluginRow[]): Promise<string[]> => {
  const inquirer = await getInquirer();
  const { selectedSpecs } = await inquirer.prompt<{ selectedSpecs: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedSpecs',
      message: 'Which Enterprise plugins do you want to install or upgrade?',
      choices: orderVisibleRows(rows).map(toCheckboxChoice),
    },
  ]);

  return selectedSpecs;
};
