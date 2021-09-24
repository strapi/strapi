'use strict';

// module.exports = (ctx, next) => {
//   if (!ctx.state.isAuthenticated) {
//     return ctx.unauthorized();
//   }

//   return next();
// };

module.exports = ({ ctx }) => {
  return ctx.state.isAuthenticated;
};
