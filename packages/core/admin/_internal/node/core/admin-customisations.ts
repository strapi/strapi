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

const loadUserAppFile = async ({
  runtimeDir,
  appDir,
}: {
  runtimeDir: string;
  appDir: string;
}): Promise<AppFile | undefined> => {
  for (const file of ADMIN_APP_FILES) {
    const filePath = path.join(appDir, 'src', 'admin', file);

    if (fs.existsSync(filePath)) {
      let relativePath = path.relative(runtimeDir, filePath);

      if (process.platform === 'win32') {
        relativePath = relativePath.split(path.sep).join(path.posix.sep);
      }

      return { path: relativePath };
    }
  }

  return undefined;
};

export { loadUserAppFile };
export type { AdminCustomisations, AppFile };
