import { Core } from '@strapi/types';
import { getService } from '../utils';
import { UserLayout, UserLayoutSchema, UserLayoutWrite, UserLayoutWriteSchema } from '../../src/controllers/validation/schema';

const STORE = { type: "core", name: "admin" } as const;
const DEFAULT_WIDTH = 6 as const;
const keyFor = (userId: number) => `homepage-layout:${userId}`;

const isContentTypeVisible = (model: any) =>
  model?.pluginOptions?.['content-type-builder']?.visible !== false;

export const homepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getKeyStatistics = async () => {
    const contentTypes = Object.entries(strapi.contentTypes).filter(([, contentType]) => {
      return isContentTypeVisible(contentType);
    });

    const countApiTokens = await getService('api-token').count();
    const countAdmins = await getService('user').count();
    const countLocales = (await strapi.plugin('i18n')?.service('locales')?.count()) ?? null;
    const countsAssets = await strapi.db.query('plugin::upload.file').count();
    const countWebhooks = await strapi.db.query('strapi::webhook').count();

    const componentCategories = new Set(
      Object.values(strapi.components).map((component) => component.category)
    );
    const components = Array.from(componentCategories);

    return {
      assets: countsAssets,
      contentTypes: contentTypes.length,
      components: components.length,
      locales: countLocales,
      admins: countAdmins,
      webhooks: countWebhooks,
      apiTokens: countApiTokens,
    };
  };

  const getUserLayout = async (
    userId: number
  ): Promise<UserLayout | null> => {
    const store = await strapi.store(STORE);
    const key = keyFor(userId);

    const value = (await store.get({ key })) as unknown;
    if (!value) {
      // nothing saved yet
      return null;
    }

    return UserLayoutSchema.parse(value);
  };

  const updateUserLayout = async (
    userId: number,
    input: unknown
  ): Promise<UserLayout> => {
    const write: UserLayoutWrite = UserLayoutWriteSchema.parse(input);

    const store = await strapi.store(STORE);
    const key = keyFor(userId);

    const currentRaw = (await store.get({ key })) as unknown;
    const current: UserLayout | null = currentRaw
      ? UserLayoutSchema.parse(currentRaw)
      : null;

    // Final order: replace only if provided
    const orderNext = write.order ?? current?.order ?? [];

    // Build widths ONLY for UIDs present in the final order (prunes removed)
    const widthsNext = {} as any;
    for (const uid of orderNext) {
      const incoming = write.widths?.[uid];
      const existing = current?.widths[uid];
      widthsNext[uid] = (incoming ?? existing ?? DEFAULT_WIDTH);
    }

    const next: UserLayout = {
      version: (current?.version ?? 0) + 1,
      order: orderNext,
      widths: widthsNext,
      updatedAt: new Date().toISOString(),
    };

    await store.set({ key, value: next });
    return next;
  };
  return {
    getKeyStatistics,
    getUserLayout,
    updateUserLayout,
  };
};
