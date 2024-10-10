import { requirementFactory } from '../../../modules/requirement';
import { semVerFactory } from '../../../modules/version';

export const REQUIRE_AVAILABLE_NEXT_MAJOR = requirementFactory(
  'REQUIRE_AVAILABLE_NEXT_MAJOR',
  (context) => {
    const { project, target } = context;

    const currentMajor = project.strapiVersion.major;
    const targetedMajor = target.major;

    if (targetedMajor === currentMajor) {
      throw new Error(`You're already on the latest major version (v${currentMajor})`);
    }
  }
);

export const REQUIRE_LATEST_FOR_CURRENT_MAJOR = requirementFactory(
  'REQUIRE_LATEST_FOR_CURRENT_MAJOR',
  (context) => {
    const { project, target, npmVersionsMatches } = context;
    const { major: currentMajor } = project.strapiVersion;

    const invalidMatches = npmVersionsMatches.filter(
      (match) => semVerFactory(match.version).major === currentMajor
    );

    if (invalidMatches.length > 0) {
      const invalidVersions = invalidMatches.map((match) => match.version);
      const invalidVersionsCount = invalidVersions.length;

      throw new Error(
        `Doing a major upgrade requires to be on the latest v${currentMajor} version, but found ${invalidVersionsCount} versions between the current one and ${target}. Please upgrade to ${invalidVersions.at(-1)} and try again.`
      );
    }
  }
);
