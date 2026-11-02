'use strict';

const NodeEnvironment = require('jest-environment-node').default;

// Runs a test file with the worker process in the timezone the file asks for, so that the cases
// where local time differs from UTC are covered whatever the timezone of the machine running the
// tests. Node applies a change of `process.env.TZ` at once, but only from outside the test sandbox,
// whose `process.env` is a copy: it has to be done by the environment. The previous timezone is
// restored on teardown, so sibling files in the same worker are not affected. Same option as the
// `@strapi/admin-test-utils/environment` of the front-end tests. Opt in per file, with a path
// relative to the jest rootDir of the package:
//
//   /**
//    * @jest-environment ../../../tests/setup/timezone-environment.js
//    * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
//    */
class TimezoneEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);

    const { tz } = config.projectConfig.testEnvironmentOptions.strapi ?? {};

    this.timezone = tz;
    this.previousTimezone = process.env.TZ;

    if (tz) {
      process.env.TZ = tz;
    }
  }

  async teardown() {
    if (this.timezone) {
      if (this.previousTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = this.previousTimezone;
      }
    }

    await super.teardown();
  }
}

module.exports = TimezoneEnvironment;
