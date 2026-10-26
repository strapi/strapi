export const PLUGIN_ID = 'provenance';

export const PERMISSIONS = {
  read: [{ action: 'plugin::provenance.settings.read', subject: null }],
  update: [{ action: 'plugin::provenance.settings.update', subject: null }],
  // Token profiles are part of API token management
  readTokens: [{ action: 'admin::api-tokens.read', subject: null }],
  updateTokens: [{ action: 'admin::api-tokens.update', subject: null }],
};

export type Source =
  'ai-generated' | 'ai-assisted' | 'human-entered' | 'automated' | 'unattributed';

export type TokenProfile = 'agent' | 'integration' | 'mixed';

export interface FieldProvenance {
  source: Source;
  signal: string;
  drifted: boolean;
  model: string | null;
  agent: string | null;
  actor: { type: string; id: string | null } | null;
  recordedAt: string | null;
  review: { byId: string; by: string | null; at: string } | null;
  reviewOutdated: boolean;
}

export interface EntryProvenance {
  locale: string | null;
  status: 'draft' | 'published';
  fields: Record<string, FieldProvenance>;
  publishRequiresReview: boolean;
}

export interface WorkflowRules {
  approvalStageId: number | null;
  reworkStageId: number | null;
  aiReviewStageId: number | null;
}

export interface Settings {
  requireReviewBeforePublish: boolean;
  workflows: Record<string, WorkflowRules>;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  contentTypes: string[];
  stageRequiredToPublishId: number | null;
  stages: Array<{ id: number; name: string; color: string | null }>;
}

export interface TokenWithProfile {
  id: string;
  name: string;
  description: string | null;
  kind: 'content-api' | 'admin';
  type: string | null;
  profile: TokenProfile | null;
}

export const isAiSource = (source: Source) => source === 'ai-generated' || source === 'ai-assisted';
