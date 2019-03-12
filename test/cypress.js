const cypress = require('cypress');

const config = Object.assign(
  {
    spec: './packages/**/test/front/integration/*',
  },
  process.env.npm_config_browser === 'true' ? { browser: 'chrome' } : {}
);

cypress
  .run(config)
  .then(results => {
    if (results.totalFailed > 0) {
      return process.stdout.write('Cypress tests finished with errors\n', () => {
        process.exit(1);
      });
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.stdout.write('Error running cypress', () => {
      process.exit(1);
    });
  });
