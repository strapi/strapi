import { AbortedError } from '../../../modules/error';
import * as f from '../../../modules/format';
import { saveJSON } from '../../../modules/json';
import {
  findUnpinnedStrapiDependencies,
  getStrapiPinTargetVersion,
  pinStrapiDependencies,
} from '../../../modules/project/strapi-dependencies';
import { assertAppProject } from '../../../modules/project/utils';

import type { Project } from '../../../modules/project';
import type { UpgradeOptions } from '../types';

/**
 * Detects ranged @strapi/* dependencies and offers to pin them before upgrading.
 *
 * The upgrade tool matches and bumps only exact semver pins. Ranges (e.g. ^4.26.1)
 * make the current version ambiguous and can cause false "already up-to-date" errors.
 */
export const pinVersions = async (project: Project, options: UpgradeOptions) => {
  assertAppProject(project);

  const unpinned = findUnpinnedStrapiDependencies(
    project.packageJSON.dependencies,
    project.packageJSON.devDependencies
  );

  if (unpinned.length === 0) {
    return;
  }

  const pinTarget = getStrapiPinTargetVersion(project);
  const pinVersion = pinTarget.raw;

  const unpinnedList = unpinned
    .map(({ name, declaredVersion }) => `${name} (${f.highlight(declaredVersion)})`)
    .join(', ');

  options.logger.warn(
    [
      'Found @strapi/* dependencies using version ranges instead of pinned versions:',
      unpinnedList,
      `(will pin to ${f.version(pinTarget)} before upgrading)`,
    ].join(' ')
  );

  const confirmed =
    typeof options.confirm === 'function'
      ? await options.confirm(
          `Pin all @strapi/* dependencies to ${f.version(pinTarget)} before upgrading?`
        )
      : true;

  if (!confirmed) {
    throw new AbortedError();
  }

  const updatedPackageJSON = pinStrapiDependencies(project.packageJSON, pinVersion, unpinned);

  if (options.dry) {
    project.applyPackageJSON(updatedPackageJSON);
    options.logger.warn('Pinned versions in memory only (dry mode).');
    return;
  }

  await saveJSON(project.packageJSONPath, updatedPackageJSON);
  project.refresh();
};
