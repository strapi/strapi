import path from 'node:path';
import { loadFile } from './files';

const ADMIN_APP_FILES = ['app.js', 'app.mjs', 'app.ts', 'app.jsx', 'app.tsx'];

interface AdminCustomisations {
  config?: {
    locales?: string[];
  };
  bootstrap?: Function;
}

interface AppFile {
  path: string;
  config: AdminCustomisations['config'];
}

const loadUserAppFile = async (appDir: string): Promise<AppFile | undefined> => {
  for (const file of ADMIN_APP_FILES) {
    const filePath = path.join(appDir, 'src', 'admin', file);
    const configFile = await loadFile(filePath);

    if (configFile) {
      return { path: filePath, config: configFile };
    }
  }

  return undefined;
};

export { loadUserAppFile };
export type { AdminCustomisations, AppFile };
