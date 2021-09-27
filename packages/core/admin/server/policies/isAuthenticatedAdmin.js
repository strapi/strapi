'use strict';

module.exports = ({ ctx }) => {
  return Boolean(ctx.state.isAuthenticated);
};
