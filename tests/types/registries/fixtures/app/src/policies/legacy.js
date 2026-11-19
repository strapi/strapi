'use strict';

// An untyped JS policy: its config is `unknown`.
module.exports = (policyContext, config) => config !== undefined;
