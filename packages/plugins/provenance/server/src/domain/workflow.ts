import type { Declaration } from './types';

export type StageId = number;

/**
 * How a review workflow uses provenance. Every stage is optional: a `null` stage turns its
 * rule off.
 *
 * - `approvalStageId`: entering it is an editorial approval. A human doing so reviews every
 *   tracked field; an AI channel cannot do so.
 * - `reworkStageId`: where an approved entry goes back when one of its fields changes.
 * - `aiReviewStageId`: where an entry goes when an AI writes into it.
 */
export type WorkflowRules = {
  approvalStageId: StageId | null;
  reworkStageId: StageId | null;
  aiReviewStageId: StageId | null;
};

export const NO_RULES: WorkflowRules = {
  approvalStageId: null,
  reworkStageId: null,
  aiReviewStageId: null,
};

/**
 * Problems that would make the rules contradict each other. The approval stage must stay
 * apart: an AI write sent there would be refused, and a change sent back there would count
 * as approved.
 */
export const findRuleConflicts = (rules: WorkflowRules): string[] => {
  if (rules.approvalStageId === null) {
    return [];
  }

  const conflicts: string[] = [];

  if (rules.aiReviewStageId === rules.approvalStageId) {
    conflicts.push('"When an AI edits an entry" cannot use the approval stage');
  }

  if (rules.reworkStageId === rules.approvalStageId) {
    conflicts.push('"When approved content is edited" cannot use the approval stage');
  }

  return conflicts;
};

/**
 * Whether a write that moves the entry to `targetStageId` is allowed. Approving is taking
 * editorial responsibility: only a person can. Agents, integrations and unqualified tokens
 * can draft and send content to review.
 */
export const canEnterStage = (
  rules: WorkflowRules,
  targetStageId: StageId,
  base: Declaration
): boolean => {
  return !(targetStageId === rules.approvalStageId && base.origin !== 'human');
};

/**
 * Whether entering `targetStageId` counts as a human review of the entry.
 */
export const isApproval = (rules: WorkflowRules, targetStageId: StageId, base: Declaration) => {
  return (
    rules.approvalStageId !== null &&
    targetStageId === rules.approvalStageId &&
    base.origin === 'human'
  );
};

/**
 * The stage an entry moves to after a content write, or `null` to leave it where it is.
 *
 * `changed` lists the declarations of the fields the write changed. An AI write goes to AI
 * review first; otherwise a change to an approved entry sends it back to rework.
 */
export const stageAfterWrite = ({
  rules,
  currentStageId,
  changed,
}: {
  rules: WorkflowRules;
  currentStageId: StageId | null;
  changed: Declaration[];
}): StageId | null => {
  if (changed.length === 0) {
    return null;
  }

  let target: StageId | null = null;

  if (
    rules.aiReviewStageId !== null &&
    changed.some((declaration) => declaration.origin === 'ai')
  ) {
    target = rules.aiReviewStageId;
  } else if (currentStageId !== null && currentStageId === rules.approvalStageId) {
    target = rules.reworkStageId;
  }

  return target !== null && target !== currentStageId ? target : null;
};

/**
 * Reads the stage id out of a `strapi_stage` value as the Document Service accepts it.
 */
export const parseStageId = (value: unknown): StageId | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = typeof value === 'object' ? (value as { id?: unknown }).id : value;
  const id = Number(raw);

  return Number.isInteger(id) && id > 0 ? id : null;
};
