import { requirementFactory } from '../../../modules/requirement';

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

    if (npmVersionsMatches.length !== 1) {
      const invalidVersions = npmVersionsMatches.slice(0, -1);
      const invalidVersionsAsSemVer = invalidVersions.map((v) => v.version);
      const nbInvalidVersions = npmVersionsMatches.length;
      const currentMajor = project.strapiVersion.major;

      throw new Error(
        `Doing a major upgrade requires to be on the latest v${currentMajor} version, but found ${nbInvalidVersions} versions between the current one and ${target}: ${invalidVersionsAsSemVer}`
      );
    }
  }
);
