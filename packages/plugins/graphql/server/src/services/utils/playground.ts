import { Context } from '../types';

export default (ctx: Context) => {
  return {
    isEnabled() {
      return !(
        process.env.NODE_ENV === 'production' &&
        !ctx.strapi.plugin('graphql').config('playgroundAlways')
      );
    },
  };
};
