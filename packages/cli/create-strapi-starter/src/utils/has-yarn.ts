import execa from 'execa';

export default function hasYarn() {
  try {
    const { exitCode } = execa.commandSync('yarn --version', { shell: true });

    if (exitCode === 0) return true;
  } catch (err) {
    return false;
  }
}
