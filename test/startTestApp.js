const { startTestApp } = require('./helpers/testAppGenerator');

const appName = 'testApp';

const main = async () => {
  try {
    const { ready, end } = startTestApp({ appName });

    await ready;

    // stop tests if the testApp stops
    await end
      .then(() => {
        process.stdout.write('testApp exited before the end', () => {
          process.exit(1);
        });
      })
      .catch(err => {
        console.log(err);
        process.stdout.write('testApp exited before the end with error', () => {
          process.exit(1);
        });
      });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();
