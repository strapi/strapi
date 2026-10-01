import { getInquirer } from '../../../utils/get-inquirer';
import type { EnterprisePluginEntry } from './discovery';
import { resolvePluginStatus } from './plugin-status';
import type { PackumentLookup } from './registry';
import { isPrerelease } from './versions';

type PluginRowState =
  /** Installed, and a newer compatible version exists. Selected by default. */
  | { state: 'upgrade'; installedVersion: string; targetVersion: string; newerVersionNote?: string }
  /** Not installed, and the license includes it. */
  | { state: 'install'; targetVersion: string; newerVersionNote?: string }
  /** Installed and up to date for this Strapi version. */
  | { state: 'installed'; installedVersion: string; newerVersionNote?: string }
  /** Installed, but the license does not include it anymore. */
  | { state: 'not-licensed'; installedVersion: string }
  /** Not installed, and no stable version fits this Strapi version. */
  | { state: 'no-compatible-version'; requiredStrapiRange: string }
  /** Not installed, and only prerelease versions exist. */
  | { state: 'no-stable-release' }
  /** Not installed, and not available to this license: not shown. */
  | { state: 'hidden' };

export type PluginRow = { entry: EnterprisePluginEntry } & PluginRowState;

export type SelectableRow = Extract<PluginRow, { state: 'upgrade' | 'install' }>;

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

  if (status.state === 'not-licensed' || status.state === 'not-found') {
    return status.state === 'not-licensed' && installedVersion
      ? { entry, state: 'not-licensed', installedVersion }
      : { entry, state: 'hidden' };
  }

  if (status.state === 'install') {
    return { entry, ...status };
  }

  if (!installedVersion) {
    // Only an installed plugin can be an upgrade or up to date.
    return status.state === 'no-compatible-version'
      ? { entry, state: 'no-compatible-version', requiredStrapiRange: status.requiredStrapiRange }
      : { entry, state: 'no-stable-release' };
  }

  switch (status.state) {
    case 'upgrade':
      return { entry, ...status, installedVersion };
    case 'no-compatible-version':
      // No version for this app. An installed plugin stays listed as installed.
      return {
        entry,
        state: 'installed',
        installedVersion,
        newerVersionNote: status.newerVersionNote,
      };
    case 'no-stable-release':
      return { entry, state: 'installed', installedVersion };
    default:
      return { entry, ...status, installedVersion };
  }
};

const ROW_ORDER: PluginRow['state'][] = [
  'upgrade',
  'install',
  'installed',
  'not-licensed',
  'no-compatible-version',
  'no-stable-release',
];

export const isSelectable = (row: PluginRow): row is SelectableRow =>
  row.state === 'upgrade' || row.state === 'install';

export const toInstallSpec = (row: SelectableRow): string =>
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
  const noteSuffix = (note?: string) => (note ? `  ${note}` : '');

  switch (row.state) {
    case 'upgrade': {
      // Replacing a prerelease with the stable release can be a step back, so it is only offered.
      const replacesPrerelease = isPrerelease(row.installedVersion);

      return {
        name: `${label}  ${row.installedVersion} → ${row.targetVersion} ${replacesPrerelease ? '[stable release]' : '[upgrade]'}${noteSuffix(row.newerVersionNote)}`,
        value: toInstallSpec(row),
        checked: !replacesPrerelease,
      };
    }
    case 'install':
      return {
        name: `${label}  ${row.targetVersion}  ${row.entry.summary}${noteSuffix(row.newerVersionNote)}`,
        value: toInstallSpec(row),
        checked: false,
      };
    case 'installed':
      return {
        name: `${label}  ${row.installedVersion}`,
        disabled: row.newerVersionNote ? `installed, ${row.newerVersionNote}` : 'installed',
      };
    case 'not-licensed':
      return { name: `${label}  ${row.installedVersion}`, disabled: 'not in your license' };
    case 'no-compatible-version':
      return { name: label, disabled: `requires Strapi ${row.requiredStrapiRange}` };
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
