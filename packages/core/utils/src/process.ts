import { has } from 'lodash';

export function isDependencyInCwd(dependency: string, cwd: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(`${cwd}/package.json`);
    return has(pkg, ['dependencies', dependency]) || has(pkg, ['devDependencies', dependency]);
  } catch {
    return false;
  }
}
