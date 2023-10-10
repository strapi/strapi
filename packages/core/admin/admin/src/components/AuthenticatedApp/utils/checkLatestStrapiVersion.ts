import lt from 'semver/functions/lt';
import valid from 'semver/functions/valid';

export const checkLatestStrapiVersion = (
  currentPackageVersion: string,
  latestPublishedVersion: string
): boolean => {
  if (!valid(currentPackageVersion) || !valid(latestPublishedVersion)) {
    return false;
  }

  return lt(currentPackageVersion, latestPublishedVersion);
};
