import { run } from './app';
import { createCommandRunner } from './command-runner';

void run(process.argv.slice(2), { runner: createCommandRunner() }).then((outcome) => {
  if (outcome.stdout) process.stdout.write(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  process.exitCode = outcome.exitCode;
});
