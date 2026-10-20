import type { StrapiUpdateSeverity } from '../../../../../utils/strapiUpdate';

const DISMISSED_VERSION_KEY = 'STRAPI_UPGRADE_BANNER_DISMISSED_VERSION';
const REMIND_LATER_AT_KEY = 'STRAPI_UPGRADE_BANNER_REMIND_LATER_AT';

/**
 * How long the urgent banner stays hidden after "Hide for 7 days".
 */
const REMIND_LATER_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Keys are scoped to the Strapi instance, like `useScopedPersistentState`,
 * so projects running on the same origin don't share their dismissals.
 */
const getScopedKey = (key: string, scope?: string | false) => `${key}:${scope}`;

const safeGetItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, quota exceeded…): the banner will show again.
  }
};

interface UpgradeBannerDismissParams {
  severity: StrapiUpdateSeverity;
  latestVersion?: string;
  scope?: string | false;
  now?: number;
}

const isUpgradeBannerDismissed = ({
  severity,
  latestVersion,
  scope,
  now = Date.now(),
}: UpgradeBannerDismissParams) => {
  if (severity === 'urgent') {
    const remindLaterAt = Number(safeGetItem(getScopedKey(REMIND_LATER_AT_KEY, scope)));

    return Number.isFinite(remindLaterAt) && now - remindLaterAt < REMIND_LATER_DELAY_MS;
  }

  if (severity === 'default') {
    return (
      Boolean(latestVersion) &&
      safeGetItem(getScopedKey(DISMISSED_VERSION_KEY, scope)) === latestVersion
    );
  }

  return false;
};

const dismissUpgradeBanner = ({
  severity,
  latestVersion,
  scope,
  now = Date.now(),
}: UpgradeBannerDismissParams) => {
  if (severity === 'urgent') {
    safeSetItem(getScopedKey(REMIND_LATER_AT_KEY, scope), String(now));
  } else if (severity === 'default' && latestVersion) {
    safeSetItem(getScopedKey(DISMISSED_VERSION_KEY, scope), latestVersion);
  }
};

export {
  dismissUpgradeBanner,
  isUpgradeBannerDismissed,
  DISMISSED_VERSION_KEY,
  REMIND_LATER_AT_KEY,
  REMIND_LATER_DELAY_MS,
};
