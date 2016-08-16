# Scheduled tasks

CRON tasks allow you to schedule jobs (arbitrary functions) for execution at specific dates, with optional recurrence rules. It only uses a single timer at any given time (rather than reevaluating upcoming jobs every second/minute).

## Configuration and usage

Configuration:

- Key: `cron`
- Environment: all
- Location: `./config/functions/cron.js`
- Type: `object`

Example:

```js
module.exports.cron = {

  /**
   * Every day at midnight.
   */

  '0 0 * * *': function () {
    strapi.log.info('Midnight !');
  }
};
```

Notes:

- The cron format consists of:
    1. second (0 - 59, optional)
    2. minute (0 - 59)
    3. hour (0 - 23)
    4. day of month (1 - 31)
    5. month (1 - 12)
    6. day of week (0 - 7)
