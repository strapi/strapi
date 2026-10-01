import { EnterpriseInstallError } from './errors';
import type { PackumentLookup } from './registry';
import { describeNewerIncompatibleVersion, isUpgrade, pickTargetVersion } from './versions';

export type PluginStatus =
  /** Not installed, and a stable version fits this Strapi version. */
  | { state: 'install'; targetVersion: string; newerVersionNote?: string }
  /** Installed, and a newer compatible version exists. */
  | { state: 'upgrade'; targetVersion: string; newerVersionNote?: string }
  /** Installed and up to date for this Strapi version. */
  | { state: 'installed'; newerVersionNote?: string }
  /** No stable version fits this Strapi version. */
  | { state: 'no-compatible-version'; requiredStrapiRange: string; newerVersionNote?: string }
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
  const newerVersionNote = describeNewerIncompatibleVersion(versionChoice, installedVersion);
  const { targetVersion, newestVersionStrapiRange } = versionChoice;

  if (!targetVersion) {
    // A stable version only fails to fit when it declares a Strapi range, so the newest one has one.
    return newestVersionStrapiRange
      ? {
          state: 'no-compatible-version',
          requiredStrapiRange: newestVersionStrapiRange,
          newerVersionNote,
        }
      : { state: 'no-stable-release' };
  }

  if (!installedVersion) {
    return { state: 'install', targetVersion, newerVersionNote };
  }

  return isUpgrade(installedVersion, targetVersion)
    ? { state: 'upgrade', targetVersion, newerVersionNote }
    : { state: 'installed', newerVersionNote };
};
