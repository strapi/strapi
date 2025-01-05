import { Context } from 'koa';
import { Core } from "@strapi/strapi";
import { Settings } from "../../../shared/settings";
import { PLUGIN_ID } from "../../../shared/constants";

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(ctx: Context): Promise<Settings> {
    const res = await strapi.store.get({ type: 'plugin', name: PLUGIN_ID, key: 'settings' });
    return res as Settings | null;
  },
  async updateSettings(ctx: Context): Promise<Settings> {
    const value = ctx.request.body;
    await strapi.store.set({ type: 'plugin', name: PLUGIN_ID, key: 'settings', value });
    return await this.getSettings(ctx);
  }
});
export default service;