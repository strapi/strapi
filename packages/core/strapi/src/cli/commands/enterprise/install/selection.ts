import type { EnterprisePluginEntry } from './discovery';
import { promptChecklist, type ChecklistChoice, type ChecklistFooter } from './checklist-prompt';
import { resolvePluginStatus } from './plugin-status';
import type { PackumentLookup } from './registry';
import { isPrerelease } from './versions';

type PluginRowState =
  /** Installed, and a newer compatible version exists. Selected by default. */
  | {
      state: 'upgrade';
      installedVersion: string;
      targetVersion: string;
      isMajorUpgrade: boolean;
      newerVersionNote?: string;
    }
  /** Not installed, and the license includes it. */
  | { state: 'install'; targetVersion: string; newerVersionNote?: string }
  /** Installed and up to date for this Strapi version. */
  | { state: 'installed'; installedVersion: string; newerVersionNote?: string }
  /** Installed, but the license does not include it anymore. */
  | { state: 'not-licensed'; installedVersion: string; listedOutsideLicense: boolean }
  /** Not installed, and no stable version fits this Strapi version. */
  | { state: 'no-compatible-version'; requiredStrapiRange: string }
  /** Not installed, and only prerelease versions exist. */
  | { state: 'no-stable-release' }
  /** Not installed, and the catalog lists it outside the license. Shown, but not selectable. */
  | { state: 'locked' }
  /** Not installed, not available to this license, and not in the catalog: not shown. */
  | { state: 'hidden' };

export type PluginRow = { entry: EnterprisePluginEntry } & PluginRowState;

export type SelectableRow = Extract<PluginRow, { state: 'upgrade' | 'install' }>;

type ChecklistRow = Exclude<PluginRow, { state: 'locked' | 'hidden' }>;

const isChecklistRow = (row: PluginRow): row is ChecklistRow =>
  row.state !== 'locked' && row.state !== 'hidden';

export const buildPluginRow = ({
  entry,
  lookup,
  installedVersion,
  strapiVersion,
  listedOutsideLicense = false,
}: {
  entry: EnterprisePluginEntry;
  lookup: PackumentLookup;
  installedVersion?: string;
  strapiVersion?: string;
  listedOutsideLicense?: boolean;
}): PluginRow => {
  const status = resolvePluginStatus({ lookup, installedVersion, strapiVersion });

  if (status.state === 'not-licensed' || status.state === 'not-found') {
    return status.state === 'not-licensed' && installedVersion
      ? { entry, state: 'not-licensed', installedVersion, listedOutsideLicense }
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
  'locked',
];

export const isSelectable = (row: PluginRow): row is SelectableRow =>
  row.state === 'upgrade' || row.state === 'install';

export const toInstallSpec = (row: SelectableRow): string =>
  `${row.entry.packageName}@${row.targetVersion}`;

const describeUpgrade = (row: Extract<PluginRow, { state: 'upgrade' }>): string => {
  if (isPrerelease(row.installedVersion)) {
    return '[stable release]';
  }

  return row.isMajorUpgrade ? '[major upgrade]' : '[upgrade]';
};

const describeLabel = ({ displayName, packageName, kind }: EnterprisePluginEntry): string => {
  const kindTag = kind && kind !== 'plugin' ? ` [${kind}]` : '';

  return `${displayName} (${packageName})${kindTag}`;
};

export const toCheckboxChoice = (row: ChecklistRow): ChecklistChoice => {
  const { displayName } = row.entry;
  const label = describeLabel(row.entry);
  // The note is a sentence of its own, such as "1.3.0 is available but requires Strapi ^5.56.0."
  const noteSuffix = (note?: string) => (note ? `  ${note}` : '');

  switch (row.state) {
    case 'upgrade': {
      const upgradeTag = describeUpgrade(row);

      return {
        name: `${label}  ${row.installedVersion} → ${row.targetVersion} ${upgradeTag}${noteSuffix(row.newerVersionNote)}`,
        value: toInstallSpec(row),
        short: displayName,
        checked: upgradeTag === '[upgrade]',
      };
    }
    case 'install':
      return {
        name: `${label}  ${row.targetVersion}  ${row.entry.summary}${noteSuffix(row.newerVersionNote)}`,
        value: toInstallSpec(row),
        short: displayName,
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
    default: {
      const unexpectedRow: never = row;

      return unexpectedRow;
    }
  }
};

/** Visible rows, with upgrades first. Unticking a row never uninstalls anything. */
export const orderVisibleRows = (rows: PluginRow[]): PluginRow[] =>
  rows
    .filter((row) => row.state !== 'hidden')
    .sort((left, right) => ROW_ORDER.indexOf(left.state) - ROW_ORDER.indexOf(right.state));

export const describeLockedGroup = (notLicensedMessage?: string): string =>
  notLicensedMessage || 'Not in your license.';

const toLockedFooter = (
  rows: PluginRow[],
  notLicensedMessage?: string
): ChecklistFooter | undefined => {
  const lines = rows
    .filter((row) => row.state === 'locked')
    .map(({ entry }) => `  ✕ ${describeLabel(entry)}${entry.summary ? `  ${entry.summary}` : ''}`);

  return lines.length > 0 ? { heading: describeLockedGroup(notLicensedMessage), lines } : undefined;
};

export const describeLockedRows = (
  rows: PluginRow[],
  notLicensedMessage?: string
): string | undefined => {
  const footer = toLockedFooter(rows, notLicensedMessage);

  return footer && [footer.heading, ...footer.lines].join('\n');
};

export const promptForPlugins = (
  rows: PluginRow[],
  notLicensedMessage?: string
): Promise<string[]> => {
  const visibleRows = orderVisibleRows(rows);

  return promptChecklist({
    message: 'Which Enterprise plugins do you want to install or upgrade?',
    choices: visibleRows.filter(isChecklistRow).map(toCheckboxChoice),
    footer: toLockedFooter(visibleRows, notLicensedMessage),
  });
};
