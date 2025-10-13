import type { Settings } from '../controllers/validation/settings';

const settingsService = () => {
  async function getSettings() {
    const res = await strapi.store!({ type: 'plugin', name: 'i18n', key: 'settings' }).get({});

    return res as Settings | null;
  }

  function setSettings(value: Settings) {
    return strapi.store!({ type: 'plugin', name: 'i18n', key: 'settings' }).set({ value });
  }

  return {
    getSettings,
    setSettings,
  };
};

export default settingsService;

export type SettingsService = typeof settingsService;
