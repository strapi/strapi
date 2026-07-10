/**
 * Validates GitHub bug reports against BUG_REPORT.yml structure.
 *
 * Uses section headers (### Title) rather than brittle per-field regex so
 * short but valid values (e.g. Node "20", yarn version "1") are accepted.
 */

import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Values GitHub issue forms insert when a field is left empty — not intentional answers.
 * We do not reject NA/N/A, "-", etc.; content quality is for humans to triage.
 */
const EMPTY_FIELD_MARKERS = new Set(['', 'no response']);

/** Required sections from .github/ISSUE_TEMPLATE/BUG_REPORT.yml. */
export const REQUIRED_SECTIONS = [
  'Node Version',
  'Package Manager',
  'Package Manager Version',
  'Strapi Version',
  'Operating System',
  'Database',
  'Javascript or Typescript',
  'Bug Description',
  'Steps to Reproduce',
  'Expected Behavior',
] as const;

/** Common alternate spellings beyond case differences. */
const SECTION_HEADER_ALIASES: Record<string, (typeof REQUIRED_SECTIONS)[number]> = {
  'js or ts': 'Javascript or Typescript',
  'javascript/typescript': 'Javascript or Typescript',
};

const REQUIRED_SECTION_LOOKUP = new Map<string, (typeof REQUIRED_SECTIONS)[number]>(
  REQUIRED_SECTIONS.map((title) => [normalizeHeader(title), title])
);

for (const [alias, canonical] of Object.entries(SECTION_HEADER_ALIASES)) {
  REQUIRED_SECTION_LOOKUP.set(normalizeHeader(alias), canonical);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function canonicalSectionTitle(header: string): string {
  return REQUIRED_SECTION_LOOKUP.get(normalizeHeader(header)) ?? header.trim();
}

const REQUIRED_CHECKBOXES = [
  {
    id: 'duplicateCheck',
    label: 'Duplicate issues checkbox',
    keywordGroups: [[/check/i, /duplicate/i]],
  },
  {
    id: 'codeOfConduct',
    label: 'Code of Conduct checkbox',
    keywordGroups: [[/code of conduct/i], [/contributing guidelines/i]],
  },
] as const;

export interface TemplateValidationResult {
  valid: boolean;
  missingItems: string[];
}

export function parseIssueSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split('\n');
  let currentHeader: string | null = null;
  let currentContent: string[] = [];

  const flush = () => {
    if (currentHeader === null) {
      return;
    }

    const key = canonicalSectionTitle(currentHeader);
    const next = currentContent.join('\n').trim();
    const existing = sections.get(key);

    if (existing) {
      sections.set(key, `${existing}\n\n${next}`.trim());
      return;
    }

    sections.set(key, next);
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush();
      currentHeader = line.slice(4).trim();
      currentContent = [];
      continue;
    }

    if (currentHeader !== null) {
      currentContent.push(line);
    }
  }

  flush();
  return sections;
}

export function normalizeSectionContent(content: string): string {
  return content.replace(/[_*`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isPlaceholderContent(content: string): boolean {
  if (!content.trim()) {
    return true;
  }

  const normalized = normalizeSectionContent(content);
  return EMPTY_FIELD_MARKERS.has(normalized);
}

export function getCheckedBoxLines(body: string): string[] {
  return body.split('\n').filter((line) => /\[x\]/i.test(line) && !/^\s*```/.test(line));
}

function hasCheckedRequiredCheckbox(
  body: string,
  keywordGroups: readonly (readonly RegExp[])[]
): boolean {
  const checkedBoxLines = getCheckedBoxLines(body);

  return checkedBoxLines.some((line) =>
    keywordGroups.some((group) => group.every((keyword) => keyword.test(line)))
  );
}

export function validateIssueTemplate(body: string): TemplateValidationResult {
  const missingItems: string[] = [];
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { valid: false, missingItems: ['Issue body'] };
  }

  const sections = parseIssueSections(trimmedBody);

  if (sections.size === 0) {
    return { valid: false, missingItems: ['Issue template (expected ### section headers)'] };
  }

  for (const title of REQUIRED_SECTIONS) {
    const content = sections.get(title);

    if (content === undefined) {
      missingItems.push(`Section: ${title}`);
      continue;
    }

    if (isPlaceholderContent(content)) {
      missingItems.push(`Section: ${title}`);
    }
  }

  for (const checkbox of REQUIRED_CHECKBOXES) {
    if (!hasCheckedRequiredCheckbox(trimmedBody, checkbox.keywordGroups)) {
      missingItems.push(checkbox.label);
    }
  }

  return {
    valid: missingItems.length === 0,
    missingItems,
  };
}

function formatGracePeriod(graceDays: number): string {
  return graceDays === 1 ? '1 day' : `${graceDays} days`;
}

export const INVALID_TEMPLATE_LABEL = 'flag: invalid template';
export const INVALID_TEMPLATE_GRACE_DAYS = 1;

export type InvalidTemplateAction = 'remove_label' | 'close' | 'skip';

export function buildInvalidTemplateComment(
  login: string,
  owner: string,
  repo: string,
  missingItems: string[],
  graceDays = INVALID_TEMPLATE_GRACE_DAYS
) {
  const missingList = missingItems.map((item) => `- ${item}`).join('\n');

  return (
    '> This is a templated message\n\n' +
    `Hello @${login},\n\n` +
    'We ask that you please follow the issue template.\n' +
    'A proper issue submission lets us better understand the origin of your bug and therefore help you. You can see the template guidelines for bug reports [here](.github/ISSUE_TEMPLATE/BUG_REPORT.yml).\n\n' +
    'The following required items appear to be missing or incomplete:\n' +
    `${missingList}\n\n` +
    'Please update this issue to include the missing information, or create a new issue and completely fill out the issue template [here](https://github.com/' +
    `${owner}/${repo}/issues/new?template=BUG_REPORT.yml).\n\n` +
    `If this issue is still incomplete after **${formatGracePeriod(graceDays)}**, it will be closed automatically.\n\n` +
    'Thank you.'
  );
}

export function resolveInvalidTemplateAction(
  valid: boolean,
  updatedAt: Date,
  now: Date = new Date(),
  graceDays: number = INVALID_TEMPLATE_GRACE_DAYS
): InvalidTemplateAction {
  if (valid) {
    return 'remove_label';
  }

  const cutoff = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

  if (updatedAt > cutoff) {
    return 'skip';
  }

  return 'close';
}

export function buildInvalidTemplateCloseComment(graceDays = INVALID_TEMPLATE_GRACE_DAYS) {
  return (
    '> This is a templated message\n\n' +
    'Hello!\n\n' +
    `This issue has had the **${INVALID_TEMPLATE_LABEL}** label for more than ${formatGracePeriod(graceDays)} without being updated to follow the bug report template, so it is being closed.\n\n` +
    'If you still want to report this bug, please [open a new issue](https://github.com/strapi/strapi/issues/new?template=BUG_REPORT.yml) and fill out the template completely.\n\n' +
    'Thank you!'
  );
}

export function buildInvalidTemplateFixedComment() {
  return (
    '> This is a templated message\n\n' +
    'Thanks for updating this issue — it now follows the bug report template. The **flag: invalid template** label has been removed automatically.\n\n' +
    'A team member will triage it when they can. Thank you!'
  );
}

interface IssueSummary {
  number: number;
  body: string | null;
  updated_at: string;
}

interface ProcessInvalidTemplateOptions {
  issues: IssueSummary[];
  now?: Date;
  graceDays?: number;
}

export interface InvalidTemplateProcessPlan {
  number: number;
  action: InvalidTemplateAction;
}

export function planInvalidTemplateProcessing({
  issues,
  now = new Date(),
  graceDays = INVALID_TEMPLATE_GRACE_DAYS,
}: ProcessInvalidTemplateOptions): InvalidTemplateProcessPlan[] {
  return issues.map((issue) => {
    const { valid } = validateIssueTemplate(issue.body ?? '');
    const action = resolveInvalidTemplateAction(valid, new Date(issue.updated_at), now, graceDays);

    return { number: issue.number, action };
  });
}

interface ProcessInvalidTemplateIssuesArgs {
  github: Octokit;
  owner: string;
  repo: string;
  graceDays?: number;
  dryRun?: boolean;
  log?: (message: string) => void;
}

export async function processInvalidTemplateIssues({
  github,
  owner,
  repo,
  graceDays = INVALID_TEMPLATE_GRACE_DAYS,
  dryRun = false,
  log = () => {},
}: ProcessInvalidTemplateIssuesArgs): Promise<{
  relabeled: number;
  closed: number;
  skipped: number;
}> {
  const now = new Date();
  let relabeled = 0;
  let closed = 0;
  let skipped = 0;

  for await (const response of github.paginate.iterator(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    labels: INVALID_TEMPLATE_LABEL,
    per_page: 100,
  })) {
    const openIssues = response.data.filter((issue) => !issue.pull_request);
    const plans = planInvalidTemplateProcessing({
      issues: openIssues.map((issue) => ({
        number: issue.number,
        body: issue.body,
        updated_at: issue.updated_at,
      })),
      now,
      graceDays,
    });

    for (const plan of plans) {
      if (plan.action === 'skip') {
        skipped += 1;
        log(`Issue #${plan.number}: still invalid, within ${graceDays}-day grace period`);
        continue;
      }

      if (plan.action === 'remove_label') {
        log(`Issue #${plan.number}: now valid, removing label`);
        if (!dryRun) {
          try {
            await github.rest.issues.removeLabel({
              owner,
              repo,
              issue_number: plan.number,
              name: INVALID_TEMPLATE_LABEL,
            });
          } catch {
            // Label may have been removed concurrently — not fatal
          }

          await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: plan.number,
            body: buildInvalidTemplateFixedComment(),
          });
        }
        relabeled += 1;
        continue;
      }

      log(`Issue #${plan.number}: still invalid after ${graceDays} days, closing`);
      if (!dryRun) {
        await github.rest.issues.createComment({
          owner,
          repo,
          issue_number: plan.number,
          body: buildInvalidTemplateCloseComment(graceDays),
        });

        await github.rest.issues.update({
          owner,
          repo,
          issue_number: plan.number,
          state: 'closed',
          state_reason: 'not_planned',
        });
      }
      closed += 1;
    }
  }

  return { relabeled, closed, skipped };
}
