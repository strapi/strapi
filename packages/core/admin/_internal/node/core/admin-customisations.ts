import path from 'node:path';
import fs from 'node:fs';

const ADMIN_APP_FILES = ['app.js', 'app.mjs', 'app.ts', 'app.jsx', 'app.tsx'];

interface AdminCustomisations {
  config?: {
    locales?: string[];
  };
  bootstrap?: Function;
}

interface AppFile {
  path: string;
}

const loadUserAppFile = async (appDir: string): Promise<AppFile | undefined> => {
  for (const file of ADMIN_APP_FILES) {
    const filePath = path.join(appDir, 'src', 'admin', file);

    if (fs.existsSync(filePath)) {
      return { path: filePath };
    }
  }

  return undefined;
};

export { loadUserAppFile };
export type { AdminCustomisations, AppFile };
