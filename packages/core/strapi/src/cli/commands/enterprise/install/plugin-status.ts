import { EnterpriseInstallError } from './errors';
import type { PackumentLookup } from './registry';
import { describeNewerIncompatibleVersion, isUpgrade, pickTargetVersion } from './versions';

export type PluginStatus =
  /** Not installed, and a stable version fits this Strapi version. */
  | { state: 'install'; targetVersion: string; note?: string }
  /** Installed, and a newer compatible version exists. */
  | { state: 'upgrade'; targetVersion: string; note?: string }
  /** Installed and up to date for this Strapi version. */
  | { state: 'installed'; note?: string }
  /** No stable version fits this Strapi version. */
  | { state: 'no-compatible-version'; requiredStrapiRange?: string; note?: string }
  /** Only prerelease versions exist. */
  | { state: 'no-stable-release' }
  /** The license does not include it. */
  | { state: 'not-licensed' }
  /** The registry has no such package. */
  | { state: 'not-found' };

export const resolvePluginStatus = ({
  lookup,
  installedVersion,
  strapiVersion,
}: {
  lookup: PackumentLookup;
  installedVersion?: string;
  strapiVersion?: string;
}): PluginStatus => {
  if (lookup.status === 'license-rejected' || lookup.status === 'unavailable') {
    throw new EnterpriseInstallError(lookup.message);
  }

  if (lookup.status !== 'available') {
    return { state: lookup.status };
  }

  const versionChoice = pickTargetVersion(lookup.packument, strapiVersion);
  const note = describeNewerIncompatibleVersion(versionChoice, installedVersion);
  const { targetVersion } = versionChoice;

  if (!targetVersion) {
    return versionChoice.newestVersion
      ? {
          state: 'no-compatible-version',
          requiredStrapiRange: versionChoice.newestVersionStrapiRange,
          note,
        }
      : { state: 'no-stable-release' };
  }

  if (!installedVersion) {
    return { state: 'install', targetVersion, note };
  }

  return isUpgrade(installedVersion, targetVersion)
    ? { state: 'upgrade', targetVersion, note }
    : { state: 'installed', note };
};
