import type { Core } from '@strapi/types';

import type { Settings } from '../../../shared/contracts/settings';
import { AUDITED_EVENTS } from '../constants';
import { emitAudit } from '../audit-logs';

const DEFAULT_SETTINGS = {
  defaultTimezone: null,
} satisfies Settings;

const createSettingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = async () => strapi.store({ type: 'core', name: 'content-releases' });

  return {
    async update({ settings }: { settings: Settings }): Promise<Settings> {
      const store = await getStore();
      const previous = await this.find();

      await store.set({ key: 'settings', value: settings });

      // Compare all fields so new settings are audited automatically.
      // No audit event is emitted when nothing changed.
      const keys = [
        ...new Set([...Object.keys(previous), ...Object.keys(settings)]),
      ] as (keyof Settings)[];
      const changes: Partial<Record<keyof Settings, { before: unknown; after: unknown }>> = {};

      for (const key of keys) {
        if ((previous[key] ?? null) !== (settings[key] ?? null)) {
          changes[key] = { before: previous[key] ?? null, after: settings[key] ?? null };
        }
      }

      if (Object.keys(changes).length > 0) {
        await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_SETTINGS_UPDATE, { changes });
      }

      return settings;
    },
    async find(): Promise<Settings> {
      const store = await getStore();
      const settings = (await store.get({ key: 'settings' })) as Settings | undefined;

      return {
        ...DEFAULT_SETTINGS,
        ...settings,
      };
    },
  };
};

export type SettingsService = ReturnType<typeof createSettingsService>;

export default createSettingsService;
