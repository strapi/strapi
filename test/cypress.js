const cypress = require('cypress');

const config = Object.assign(
  {
    spec: './packages/**/test/front/integration/*',
  },
  process.env.npm_config_browser === 'true' ? { browser: 'chrome' } : {}
);

cypress
  .run(config)
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
