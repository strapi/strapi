import type { Context } from 'koa';
import { getService } from '../utils';

export default {
  getReservedNames(ctx: Context) {
    ctx.body = getService('builder').getReservedNames();
  },
};
