import lt from 'semver/functions/lt';
import major from 'semver/functions/major';
import minor from 'semver/functions/minor';
import valid from 'semver/functions/valid';

/**
 * Above this number of minor releases behind (same major), an available update is shown as urgent.
 */
const URGENT_RELEASES_BEHIND_THRESHOLD = 10;

type StrapiUpdateSeverity = 'none' | 'default' | 'urgent';

interface StrapiUpdateInfo {
  severity: StrapiUpdateSeverity;
  /**
   * Number of minor versions between the installed and the latest version (patches don't count).
   * Only meaningful when both versions share the same major.
   */
  releasesBehind: number;
  /**
   * `true` when the installed version is on an older major than the latest release.
   */
  isMajorBehind: boolean;
}

const NO_UPDATE: StrapiUpdateInfo = { severity: 'none', releasesBehind: 0, isMajorBehind: false };

const isUpdateAvailable = (currentVersion?: string | null, latestVersion?: string | null) => {
  if (!currentVersion || !latestVersion || !valid(currentVersion) || !valid(latestVersion)) {
    return false;
  }

  return lt(currentVersion, latestVersion);
};

/**
 * Returns the number of minor releases between two versions of the same major.
 * Returns 0 when there is no update or when the versions are on different majors.
 */
const getReleasesBehind = (currentVersion?: string | null, latestVersion?: string | null) => {
  if (!isUpdateAvailable(currentVersion, latestVersion)) {
    return 0;
  }

  if (major(currentVersion!) !== major(latestVersion!)) {
    return 0;
  }

  return minor(latestVersion!) - minor(currentVersion!);
};

const getStrapiUpdateInfo = (
  currentVersion?: string | null,
  latestVersion?: string | null
): StrapiUpdateInfo => {
  if (!isUpdateAvailable(currentVersion, latestVersion)) {
    return NO_UPDATE;
  }

  const isMajorBehind = major(currentVersion!) < major(latestVersion!);
  const releasesBehind = getReleasesBehind(currentVersion, latestVersion);
  const isUrgent = isMajorBehind || releasesBehind > URGENT_RELEASES_BEHIND_THRESHOLD;

  return {
    severity: isUrgent ? 'urgent' : 'default',
    releasesBehind,
    isMajorBehind,
  };
};

export {
  getReleasesBehind,
  getStrapiUpdateInfo,
  isUpdateAvailable,
  URGENT_RELEASES_BEHIND_THRESHOLD,
};
export type { StrapiUpdateInfo, StrapiUpdateSeverity };
