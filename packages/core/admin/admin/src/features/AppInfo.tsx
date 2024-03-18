import { createContext } from '../components/Context';

interface AppInfoContextValue {
  autoReload?: boolean;
  communityEdition?: boolean;
  currentEnvironment?: string;
  dependencies?: Record<string, string>;
  latestStrapiReleaseTag?: string;
  nodeVersion?: string;
  projectId?: string | null;
  shouldUpdateStrapi?: boolean;
  strapiVersion?: string | null;
  useYarn?: boolean;
  userId?: string;
}

const [AppInfoProvider, useAppInfo] = createContext<AppInfoContextValue>('AppInfo', {});

export { AppInfoProvider, useAppInfo };

export type { AppInfoContextValue };
