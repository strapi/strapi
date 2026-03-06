export const REPO = process.env.GITHUB_REPO ?? 'strapi/strapi';

export const STRAPI_ORG = process.env.GITHUB_ORG ?? 'strapi';

export const BOT_PATTERNS = ['[bot]', 'app/dependabot', 'renovate'];

export const AREA_TIERS: Record<string, string[]> = {
  critical: ['database', 'strapi'],
  high: ['content-manager', 'upload', 'users-permissions'],
  medium: ['admin', 'content-type-builder', 'i18n'],
  low: ['documentation', 'graphql', 'typescript', 'dependencies'],
};

export const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID ?? '';

export const LINEAR_CMS_GITHUB_TEAM_ID = process.env.LINEAR_CMS_GITHUB_TEAM_ID ?? '';

export const LINEAR_SPRINT_PROJECT_ID = process.env.LINEAR_SPRINT_PROJECT_ID ?? '';

export const LINEAR_STATUSES = {
  triage: process.env.LINEAR_STATUS_TRIAGE ?? '',
  todo: process.env.LINEAR_STATUS_TODO ?? '',
  done: process.env.LINEAR_STATUS_DONE ?? '',
  canceled: process.env.LINEAR_STATUS_CANCELED ?? '',
} as const;

function parseJSON<T>(envVar: string, fallback: T): T {
  const raw = process.env[envVar];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const LINEAR_LABELS: Record<string, string> = parseJSON('LINEAR_LABELS', {});

export const LINEAR_TRIAGE_LABELS: {
  priority: Record<string, string>;
  complexity: Record<string, string>;
  quickWin: string;
  hasLinkedIssue: string;
  ci: Record<string, string>;
} = parseJSON('LINEAR_TRIAGE_LABELS', {
  priority: {},
  complexity: {},
  quickWin: '',
  hasLinkedIssue: '',
  ci: {},
});

export const LINEAR_SOURCE_LABELS: Record<string, string> = parseJSON('LINEAR_SOURCE_LABELS', {});

// All label IDs managed by automation — used to preserve manually-added labels during sync
export const MANAGED_LABEL_IDS = new Set(
  [
    ...Object.values(LINEAR_LABELS),
    ...Object.values(LINEAR_TRIAGE_LABELS.priority),
    ...Object.values(LINEAR_TRIAGE_LABELS.complexity),
    ...Object.values(LINEAR_TRIAGE_LABELS.ci),
    LINEAR_TRIAGE_LABELS.quickWin,
    LINEAR_TRIAGE_LABELS.hasLinkedIssue,
    ...Object.values(LINEAR_SOURCE_LABELS),
  ].filter(Boolean)
);

export function validateConfig(): void {
  const required = [
    ['LINEAR_TEAM_ID', LINEAR_TEAM_ID],
    ['LINEAR_CMS_GITHUB_TEAM_ID', LINEAR_CMS_GITHUB_TEAM_ID],
    ['LINEAR_SPRINT_PROJECT_ID', LINEAR_SPRINT_PROJECT_ID],
    ['LINEAR_STATUS_TODO', LINEAR_STATUSES.todo],
    ['LINEAR_STATUS_DONE', LINEAR_STATUSES.done],
    ['LINEAR_STATUS_CANCELED', LINEAR_STATUSES.canceled],
    ['LINEAR_LABELS', Object.keys(LINEAR_LABELS).length > 0 ? 'ok' : ''],
    ['LINEAR_TRIAGE_LABELS', LINEAR_TRIAGE_LABELS.quickWin ? 'ok' : ''],
  ] as const;

  const missing = required.filter(([, val]) => !val).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\nSee .env.example for reference.`
    );
  }
}
