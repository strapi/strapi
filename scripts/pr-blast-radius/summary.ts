import { runSummary } from './summary-app';

void runSummary(process.argv.slice(2)).then((outcome) => {
  if (outcome.stdout) process.stdout.write(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  process.exitCode = outcome.exitCode;
});
