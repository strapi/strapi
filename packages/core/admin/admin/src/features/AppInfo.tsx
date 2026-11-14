import { createContext } from '../components/Context';

import type { StrapiUpdateSeverity } from '../utils/strapiUpdate';

interface AppInfoContextValue {
  autoReload?: boolean;
  communityEdition?: boolean;
  currentEnvironment?: string;
  dependencies?: Record<string, string>;
  /**
   * `true` when the installed version is on an older major than the latest release.
   */
  isStrapiMajorBehind?: boolean;
  latestStrapiReleaseTag?: string;
  nodeVersion?: string;
  projectId?: string | null;
  shouldUpdateStrapi?: boolean;
  /**
   * Number of minor releases between the installed and the latest version (same major only).
   */
  strapiReleasesBehind?: number;
  strapiUpdateSeverity?: StrapiUpdateSeverity;
  strapiVersion?: string | null;
  useYarn?: boolean;
  userId?: string;
}

const [AppInfoProvider, useAppInfo] = createContext<AppInfoContextValue>('AppInfo', {});

export { AppInfoProvider, useAppInfo };

export type { AppInfoContextValue };
