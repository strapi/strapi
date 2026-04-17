import type { Context } from 'koa';
import { GetAiFeatureConfig, GetAiToken } from '../../../../shared/contracts/ai';

export default {
  async getAiToken(ctx: Context) {
    if (strapi.ai.admin.isEnabled() === false) {
      return ctx.notFound();
    }

    try {
      // `admin::isAuthenticatedAdmin` only checks `ctx.state.isAuthenticated`, not `ctx.state.user`.
      // With the current admin JWT strategy, a successful auth run always sets both; this handler
      // still requires `user` because `getAiToken()` needs an admin identity. Keeps us safe if the
      // strategy/policy contract ever diverges or this action is invoked outside the normal pipeline.
      if (!ctx.state.user) {
        return ctx.unauthorized('Authentication required');
      }

      const aiToken = await strapi.ai.admin.getAiToken();

      ctx.body = {
        data: aiToken,
      } satisfies GetAiToken.Response;
    } catch (error) {
      return ctx.internalServerError('AI token request failed. Check server logs for details.');
    }
  },

  async getAiUsage(ctx: Context) {
    if (strapi.ai.admin.isEnabled() === false) {
      return ctx.notFound();
    }

    try {
      const usage = await strapi.ai.admin.getAiUsage();
      ctx.body = usage;
    } catch (error) {
      return ctx.internalServerError(
        'AI usage data request failed. Check server logs for details.'
      );
    }
  },

  async getAiFeatureConfig(ctx: Context) {
    if (strapi.ai.admin.isEnabled() === false) {
      return ctx.notFound();
    }

    try {
      const aiFeatureConfig = await strapi.ai.admin.getAiFeatureConfig();

      ctx.body = {
        data: aiFeatureConfig,
      } satisfies GetAiFeatureConfig.Response;
    } catch (error) {
      strapi.log.error('AI feature config request failed', error);
      return ctx.internalServerError(
        'AI feature config request failed. Check server logs for details.'
      );
    }
  },
};
