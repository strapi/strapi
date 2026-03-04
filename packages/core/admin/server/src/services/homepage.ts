import { Core } from '@strapi/types';
import { getService } from '../utils';
import {
  HomepageLayout,
  HomepageLayoutSchema,
  HomepageLayoutWrite,
  HomepageLayoutWriteSchema,
} from '../controllers/validation/schema';

const DEFAULT_WIDTH = 6 as const;
const keyFor = (userId: number) => `homepage-layout:${userId}`;

const isContentTypeVisible = (model: any) =>
  model?.pluginOptions?.['content-type-builder']?.visible !== false;

export const homepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const adminStore = strapi.store({ type: 'core', name: 'admin' });
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

  const getHomepageLayout = async (userId: number): Promise<HomepageLayout | null> => {
    const key = keyFor(userId);
    const value = await adminStore.get({ key });
    if (!value) {
      // nothing saved yet
      return null;
    }

    return HomepageLayoutSchema.parse(value);
  };

  const updateHomepageLayout = async (userId: number, input: unknown): Promise<HomepageLayout> => {
    const write: HomepageLayoutWrite = HomepageLayoutWriteSchema.parse(input);

    const key = keyFor(userId);

    const currentRaw = await adminStore.get({ key });
    const current: HomepageLayout | null = currentRaw
      ? HomepageLayoutSchema.parse(currentRaw)
      : null;

    const widgetsNext = write.widgets ?? current?.widgets ?? [];

    // Normalize widths (fill defaults where missing)
    const normalizedWidgets = widgetsNext.map((w) => {
      const prev = current?.widgets.find((cw) => cw.uid === w.uid);
      return {
        uid: w.uid,
        width: w.width ?? prev?.width ?? DEFAULT_WIDTH,
      };
    });

    const next: HomepageLayout = {
      version: write.version ?? 1,
      widgets: normalizedWidgets,
      updatedAt: write.updatedAt ?? new Date().toISOString(),
    };

    await adminStore.set({ key, value: next });
    return next;
  };
  return {
    getKeyStatistics,
    getHomepageLayout,
    updateHomepageLayout,
  };
};
