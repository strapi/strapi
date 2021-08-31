import semver from 'semver';

const checkLatestStrapiVersion = (currentPackageVersion, latestPublishedVersion) => {
  if (!semver.valid(currentPackageVersion) || !semver.valid(latestPublishedVersion)) {
    return false;
  }

  return semver.lt(currentPackageVersion, latestPublishedVersion);
};

export default checkLatestStrapiVersion;
