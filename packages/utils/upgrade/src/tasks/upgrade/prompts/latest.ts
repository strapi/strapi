import { AbortedError } from '../../../modules/error';
import * as f from '../../../modules/format';

import { rangeFactory, semVerFactory, Version } from '../../../modules/version';

import type { Upgrader } from '../../../modules/upgrader';
import type { UpgradeOptions } from '../types';

/**
 * Handles the upgrade prompts when using the latest tag.
 *
 * - checks if an upgrade involves a major bump, warning and asking for user confirmation before proceeding
 */
export const latest = async (upgrader: Upgrader, options: UpgradeOptions) => {
  // Exit if the upgrade target isn't the latest tag
  if (options.target !== Version.ReleaseType.Latest) {
    return;
  }

  // Retrieve utilities from the upgrader instance
  const npmPackage = upgrader.getNPMPackage();
  const target = upgrader.getTarget();
  const project = upgrader.getProject();

  const { strapiVersion: current } = project;

  // Pre-formatted strings used in logs
  const fTargetMajor = f.highlight(`v${target.major}`);
  const fCurrentMajor = f.highlight(`v${current.major}`);

  const fTarget = f.version(target);
  const fCurrent = f.version(current);

  // Flags
  const isMajorUpgrade = target.major > current.major;

  // Handle potential major upgrade, warns, and asks for confirmation to proceed
  if (isMajorUpgrade) {
    options.logger.warn(
      `Detected a major upgrade for the "${f.highlight(Version.ReleaseType.Latest)}" tag: ${fCurrent} > ${fTarget}`
    );

    // Find the latest release in between the current one and the next major
    const newerPackageRelease = npmPackage
      .findVersionsInRange(rangeFactory(`>${current.raw} <${target.major}`))
      .at(-1);

    // If the project isn't on the latest version for the current major, emit a warning
    if (newerPackageRelease) {
      const fLatest = f.version(semVerFactory(newerPackageRelease.version));
      options.logger.warn(
        `It's recommended to first upgrade to the latest version of ${fCurrentMajor} (${fLatest}) before upgrading to ${fTargetMajor}.`
      );
    }

    const proceedAnyway = await upgrader.confirm(`I know what I'm doing. Proceed anyway!`);

    if (!proceedAnyway) {
      throw new AbortedError();
    }
  }
};
