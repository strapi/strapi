import type { Core } from '@strapi/types';

import { NO_RULES, parseStageId, type WorkflowRules } from '../domain/workflow';

// Settings are read on every write; other instances pick up a change within this delay
const CACHE_TTL_MS = 30_000;

export type Settings = {
  /** Publishing fails while an AI field of the entry has no valid human review */
  requireReviewBeforePublish: boolean;
  /** Review workflow rules, by workflow id */
  workflows: Record<string, WorkflowRules>;
};

const DEFAULT_SETTINGS: Settings = { requireReviewBeforePublish: false, workflows: {} };

const normalizeRules = (value: unknown): WorkflowRules => {
  const raw = (value ?? {}) as Record<string, unknown>;

  return {
    approvalStageId: parseStageId(raw.approvalStageId),
    reworkStageId: parseStageId(raw.reworkStageId),
    aiReviewStageId: parseStageId(raw.aiReviewStageId),
  };
};

export const normalizeSettings = (value: unknown): Settings => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const workflows = (raw.workflows ?? {}) as Record<string, unknown>;

  return {
    requireReviewBeforePublish: raw.requireReviewBeforePublish === true,
    workflows: Object.fromEntries(
      Object.entries(workflows).map(([id, rules]) => [id, normalizeRules(rules)])
    ),
  };
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
     * Rules saved before conflicts were validated may reuse the approval stage: those rules
     * are ignored rather than refusing every AI write.
     */
    async getRules(workflowId: string | number): Promise<WorkflowRules> {
      const rules = (await this.get()).workflows[String(workflowId)] ?? NO_RULES;
      const { approvalStageId } = rules;

      if (approvalStageId === null) {
        return rules;
      }

      return {
        approvalStageId,
        reworkStageId: rules.reworkStageId === approvalStageId ? null : rules.reworkStageId,
        aiReviewStageId: rules.aiReviewStageId === approvalStageId ? null : rules.aiReviewStageId,
      };
    },
  };
};

export type SettingsService = ReturnType<typeof createSettingsService>;
