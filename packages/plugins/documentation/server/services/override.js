'use strict';
const _ = require('lodash');

module.exports = () => {
  const allOverrides = {};

  const register = overrides => {
    for (const [version, overridesForVersion] of Object.entries(overrides)) {
      // Check each version for a single object or array of objects
      if (Array.isArray(overridesForVersion)) {
        // When array of overrides, merge each object individually
        overridesForVersion.forEach(override => _.merge(allOverrides, { [version]: override }));
      } else {
        // Otherwise, merge the object directly
        _.merge(allOverrides, { [version]: overridesForVersion });
      }
    }
  };

  const getAllOverrides = () => {
    return allOverrides;
  };

  const getOverridesForVersion = version => {
    return allOverrides[version];
  };

  return {
    register,
    getAllOverrides,
    getOverridesForVersion,
  };
};
