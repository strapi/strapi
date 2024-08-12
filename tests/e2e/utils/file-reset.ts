import execa from 'execa';

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
}

export const pollHealthCheck = async (interval = 1_000, timeout = 30_000) => {
  const url = `http://127.0.0.1:${process.env.PORT ?? 1337}/_health`;
  console.log(`Starting to poll: ${url}`);

  let elapsed = 0;

  while (elapsed < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log('The service is up and running!');
        return; // Exit if the service is up
      }
    } catch (error) {
      // do nothing
    }

    console.log('Waiting for the service to come up...');
    // Wait for the specified interval before trying again
    await new Promise((resolve) => setTimeout(resolve, interval));
    elapsed += interval; // Update the elapsed time
  }

  // If we've exited the loop because of the timeout
  throw new Error('Timeout reached, service did not become available in time.');
};

// resetFiles resets the filesystem state back to the original state, removing uploaded files, schemas, etc
// NOTE: in some cases, call resetFiles without first using resetDatabase* can cause the restart to fail
export const resetFiles = async () => {
  if (process.env.TEST_APP_PATH) {
    console.log('Restoring filesystem');
    await execa('git', [...gitUser, 'reset', '--hard'], {
      stdio: 'inherit',
      cwd: process.env.TEST_APP_PATH,
    });

    await execa('git', [...gitUser, 'clean', '-fd'], {
      stdio: 'inherit',
      cwd: process.env.TEST_APP_PATH,
    });
  }

  // wait for server to restart after modifying files
  console.log('Waiting for Strapi to restart...');
  // TODO: this is both a waste of time and flaky. We need to find a way to access playwright server output and watch for the "up" log to appear
  await delay(4); // give it time to detect file changes and begin its restart
  await pollHealthCheck(); // give it time to come back up
};
