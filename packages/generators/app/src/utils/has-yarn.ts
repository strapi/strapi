import execa from 'execa';

export default function hasYarn() {
  try {
    const { exitCode } = execa.commandSync('yarn --version', { shell: true });
    return exitCode === 0;
  } catch (err) {
    return false;
  }
}
