import execa from 'execa';

export default async function hasYarn() {
  try {
    const { exitCode } = await execa.commandSync('yarn --version', { shell: true });

    if (exitCode === 0) return true;
  } catch (err) {
    return false;
  }
}
