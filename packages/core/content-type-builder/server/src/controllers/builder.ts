import { getService } from '../utils';

module.exports = {
  getReservedNames(ctx) {
    ctx.body = getService('builder').getReservedNames();
  },
};
