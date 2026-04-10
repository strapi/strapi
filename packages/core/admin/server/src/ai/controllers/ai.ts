import type { Context } from 'koa';
import { GetAiToken } from '../../../../shared/contracts/ai';

export default {
  async getAiToken(ctx: Context) {
    if (strapi.ai.admin.isEnabled() === false) {
      return ctx.notFound();
    }

    try {
      // TODO: auth check is not necessary? Already protected by route middleware?
      // Security check: Ensure user is authenticated and has proper permissions
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

  async getAIFeatureConfig(ctx: Context) {
    if (strapi.ai.admin.isEnabled() === false) {
      return ctx.notFound();
    }

    const aiFeatureConfig = await strapi.ai.admin.getAIFeatureConfig();

    ctx.body = {
      data: aiFeatureConfig,
    };
  },
};
