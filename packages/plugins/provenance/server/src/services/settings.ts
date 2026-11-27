import type { Core } from '@strapi/types';

import { LICENSE_FEATURE } from '../constants';

// Settings are read on every write; other instances pick up a change within this delay
const CACHE_TTL_MS = 30_000;

export type Settings = {
  /** Publishing fails while an AI field of the entry has no valid human review */
  requireReviewBeforePublish: boolean;
};

const DEFAULT_SETTINGS: Settings = { requireReviewBeforePublish: false };

export const normalizeSettings = (value: unknown): Settings => {
  const raw = (value ?? {}) as Record<string, unknown>;

  return { requireReviewBeforePublish: raw.requireReviewBeforePublish === true };
};

export const createSettingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: 'provenance', key: 'settings' });
  let cache: { value: Settings; expiresAt: number } | null = null;

  return {
    async get(): Promise<Settings> {
      if (cache !== null && cache.expiresAt > Date.now()) {
        return cache.value;
      }

      const value = normalizeSettings((await store().get({})) ?? DEFAULT_SETTINGS);
      cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };

      return value;
    },

    async set(value: unknown): Promise<Settings> {
      const settings = normalizeSettings(value);

      await store().set({ value: settings });
      cache = null;

      return settings;
    },

    /**
     * Whether the license includes the plugin. Read on every use, so a license change applies
     * without a restart. A lapse stops recording: writes made meanwhile have no provenance.
     */
    isProvenanceEnabled() {
      return strapi.ee?.features?.isEnabled(LICENSE_FEATURE) === true;
    },

    /**
     * Whether publishing waits for a human review of AI content.
     */
    async requiresReview() {
      return this.isProvenanceEnabled() && (await this.get()).requireReviewBeforePublish;
    },
  };
};

export type SettingsService = ReturnType<typeof createSettingsService>;
