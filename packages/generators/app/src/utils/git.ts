import execa from 'execa';

async function isInGitRepository(rootDir: string) {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore', cwd: rootDir });
    return true;
  } catch (_) {
    return false;
  }
}

async function isInMercurialRepository(rootDir: string) {
  try {
    await execa('hg', ['-cwd', '.', 'root'], { stdio: 'ignore', cwd: rootDir });
    return true;
  } catch (_) {
    return false;
  }
}

export default async function tryGitInit(rootDir: string) {
  try {
    await execa('git', ['--version'], { stdio: 'ignore' });
    if ((await isInGitRepository(rootDir)) || (await isInMercurialRepository(rootDir))) {
      return false;
    }

    await execa('git', ['init'], { stdio: 'ignore', cwd: rootDir });
    await execa('git', ['add', '-A'], { stdio: 'ignore', cwd: rootDir });
    await execa('git', ['commit', '-m', '"Initial commit from Create Strapi Project"'], {
      stdio: 'ignore',
      cwd: rootDir,
    });

    return true;
  } catch (_) {
    return false;
  }
}
