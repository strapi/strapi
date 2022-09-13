'use strict';

module.exports = (policyCtx) => {
  return Boolean(policyCtx.state.isAuthenticated);
};
