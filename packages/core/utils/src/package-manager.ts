import execa from 'execa';
import preferredPM from 'preferred-pm';

const supportedPackageManagers = ['npm', 'yarn'];

export type Options = {
  packageManager?: string;
};

// TODO: improve this to check if the project has a yarn.lock, or package-lock.json, or pnpm-lock.yaml, or pnpm-lock.json
export async function getPreferredPackageManager(path: string) {
  const pm = await preferredPM(path);

  if (pm?.name && supportedPackageManagers.includes(pm.name)) {
    return pm.name;
  }

  throw new Error('Could not find a supported package manager');
}

export async function runInstall(path: string, { packageManager }: Options = {}) {
  const packageManagerCmd = packageManager || (await getPreferredPackageManager(path));

  return execa(packageManagerCmd, ['install'], {
    cwd: path,
    stdin: 'ignore',
  });
}
