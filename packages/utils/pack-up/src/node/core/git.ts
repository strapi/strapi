/**
 * Extracted & reduced from https://github.com/jonschlinkert/parse-git-config/blob/master/index.js
 */
import fs from 'fs/promises';
import ini from 'ini';
import os from 'os';
import path from 'path';

const resolveConfigPath = async ({ cwd }: { cwd: string }) => {
  const configPath = path.join(os.homedir(), '.gitconfig');

  try {
    await fs.access(configPath);
    return path.resolve(cwd, configPath);
  } catch (err) {
    return null;
  }
};

/**
 * This is the type for a parsed git config file.
 *
 * There's another object attached but for ease of
 * readability we're only interested in user information.
 */
interface GitConfig {
  user: {
    name?: string;
    email?: string;
  };
}

const parseIni = (str: string): GitConfig => {
  const normalisedString = str.replace(/\[(\S+) "(.*)"\]/g, (m, $1, $2) => {
    return $1 && $2 ? `[${$1} "${$2.split('.').join('\\.')}"]` : m;
  });

  return ini.parse(normalisedString) as GitConfig;
};

/**
 * @internal
 *
 * @description Parses the global git config file.
 */
const parseGlobalGitConfig = async (): Promise<GitConfig | null> => {
  const cwd = process.cwd();

  const filepath = await resolveConfigPath({ cwd });

  if (!filepath) {
    return null;
  }

  const file = await fs.stat(filepath).then(() => fs.readFile(filepath, 'utf8'));

  return parseIni(file);
};

export { parseGlobalGitConfig };
export type { GitConfig };
