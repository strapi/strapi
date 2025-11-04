import type { Core } from '@strapi/types';
import type { Settings } from '../validation/settings';

const createSettingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const settings = strapi.store!({ type: 'plugin', name: 'i18n', key: 'settings' });

  async function getSettings() {
    const res = (await settings.get({})) as Settings | null;

    return res;
  }

  function setSettings(value: Settings) {
    return settings.set({ value });
  }

  return {
    getSettings,
    setSettings,
  };
};

export { createSettingsService };
export type SettingsService = ReturnType<typeof createSettingsService>;
