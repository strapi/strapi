import execa from 'execa';
import preferredPM from 'preferred-pm';

// Note: in theory, we should be able to support pnpm, bun, etc. as long as they
const supportedPackageManagers = ['npm', 'yarn'];

export type Options = {
  packageManager?: string;
};

export async function getPreferredPackageManager(path: string) {
  const pm = await preferredPM(path);

  if (pm?.name && supportedPackageManagers.includes(pm.name)) {
    return pm.name;
  }

  process.emitWarning(
    `We detected your packager manager (${pm?.name}) is not supported, using 'npm' instead.`
  );
  return 'npm';
}

export async function runInstall(path: string, { packageManager }: Options = {}) {
  const packageManagerCmd = packageManager || (await getPreferredPackageManager(path));

  return execa(packageManagerCmd, ['install'], {
    cwd: path,
    stdin: 'ignore',
  });
}
