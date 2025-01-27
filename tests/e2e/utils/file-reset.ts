import execa from 'execa';

import { delay, pollHealthCheck } from './restart';

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

export const resetFiles = async () => {
  if (!process.env.TEST_APP_PATH) {
    console.warn('Could not reset the files because TEST_APP_PATH not set');
    return;
  }

  console.log('Restoring filesystem');
  await execa('git', [...gitUser, 'reset', '--hard'], {
    stdio: 'inherit',
    cwd: process.env.TEST_APP_PATH,
  });

  await execa('git', [...gitUser, 'clean', '-fd'], {
    stdio: 'inherit',
    cwd: process.env.TEST_APP_PATH,
  });

  // wait for the server to restart after modifying files
  console.log('Waiting for Strapi to restart...');

  // TODO:  This is both a waste of time and flaky.
  //        We need to find a way to access playwright server output and watch for the "up" log to appear
  await delay(3); // give it time to detect file changes and begin its restart
  await pollHealthCheck(); // give it time to come back up
};
