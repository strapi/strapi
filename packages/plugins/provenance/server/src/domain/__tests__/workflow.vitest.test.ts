import { describe, expect, it } from 'vitest';

import {
  canEnterStage,
  findRuleConflicts,
  isApproval,
  parseStageId,
  stageAfterWrite,
  type WorkflowRules,
} from '../workflow';

import type { Declaration } from '../types';

const rules: WorkflowRules = { approvalStageId: 3, reworkStageId: 1, aiReviewStageId: 2 };

const declaration = (origin: Declaration['origin']): Declaration => ({
  origin,
  signal: 'none',
  actor: { type: 'system' },
});

describe('canEnterStage', () => {
  it('stops AI channels from approving', () => {
    expect(canEnterStage(rules, 3, declaration('ai'))).toBe(false);
  });

  it('lets AI channels move entries to other stages', () => {
    expect(canEnterStage(rules, 2, declaration('ai'))).toBe(true);
  });

  it('lets a person approve', () => {
    expect(canEnterStage(rules, 3, declaration('human'))).toBe(true);
  });

  it.each(['automated', 'none'] as const)('does not let %s writes approve', (origin) => {
    expect(canEnterStage(rules, 3, declaration(origin))).toBe(false);
  });

  it('allows everything without an approval stage', () => {
    expect(canEnterStage({ ...rules, approvalStageId: null }, 3, declaration('ai'))).toBe(true);
  });
});

describe('isApproval', () => {
  it('counts a human entering the approval stage', () => {
    expect(isApproval(rules, 3, declaration('human'))).toBe(true);
  });

  it('does not count other stages or other writers', () => {
    expect(isApproval(rules, 2, declaration('human'))).toBe(false);
    expect(isApproval(rules, 3, declaration('none'))).toBe(false);
    expect(isApproval(rules, 3, declaration('automated'))).toBe(false);
  });
});

describe('stageAfterWrite', () => {
  it('stays put when nothing changed', () => {
    expect(stageAfterWrite({ rules, currentStageId: 3, changed: [] })).toBeNull();
  });

  it('sends AI writes to AI review, even from the approval stage', () => {
    expect(stageAfterWrite({ rules, currentStageId: 3, changed: [declaration('ai')] })).toBe(2);
    expect(
      stageAfterWrite({
        rules,
        currentStageId: 1,
        changed: [declaration('human'), declaration('ai')],
      })
    ).toBe(2);
  });

  it('does not move an entry already in AI review', () => {
    expect(stageAfterWrite({ rules, currentStageId: 2, changed: [declaration('ai')] })).toBeNull();
  });

  it('sends an edited approved entry back to rework', () => {
    expect(stageAfterWrite({ rules, currentStageId: 3, changed: [declaration('human')] })).toBe(1);
  });

  it('leaves entries outside the approval stage alone on human edits', () => {
    expect(
      stageAfterWrite({ rules, currentStageId: 2, changed: [declaration('human')] })
    ).toBeNull();
  });

  it('falls back to rework when AI review is off', () => {
    expect(
      stageAfterWrite({
        rules: { ...rules, aiReviewStageId: null },
        currentStageId: 3,
        changed: [declaration('ai')],
      })
    ).toBe(1);
  });

  it('does nothing without rules', () => {
    expect(
      stageAfterWrite({
        rules: { approvalStageId: 3, reworkStageId: null, aiReviewStageId: null },
        currentStageId: 3,
        changed: [declaration('ai')],
      })
    ).toBeNull();
  });
});

describe('parseStageId', () => {
  it.each([
    [{ id: 4 }, 4],
    [4, 4],
    ['4', 4],
    [{ id: '7' }, 7],
    [null, null],
    [undefined, null],
    [{}, null],
    ['abc', null],
    [0, null],
  ])('%j -> %j', (value, expected) => {
    expect(parseStageId(value)).toBe(expected);
  });
});

describe('findRuleConflicts', () => {
  it('accepts distinct stages and rules without an approval stage', () => {
    expect(findRuleConflicts(rules)).toEqual([]);
    expect(
      findRuleConflicts({ approvalStageId: null, reworkStageId: 2, aiReviewStageId: 2 })
    ).toEqual([]);
  });

  it('keeps the approval stage apart from the two others', () => {
    expect(
      findRuleConflicts({ approvalStageId: 2, reworkStageId: 2, aiReviewStageId: 2 })
    ).toHaveLength(2);
  });
});
