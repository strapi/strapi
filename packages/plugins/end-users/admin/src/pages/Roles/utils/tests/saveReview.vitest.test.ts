import { describe, expect, it } from 'vitest';

import { describeSave } from '../saveReview';

import type {
  LayoutAction,
  PermissionLayout,
  RolePermission,
} from '../../../../../../shared/contracts/permissions';
import type { RoleSnapshot } from '../editorModel';

const ARTICLE = 'api::article.article';

const actions: LayoutAction[] = ['find', 'findOne'].map((action) => ({
  action: action as 'find',
  actionId: `${ARTICLE}.${action}`,
  hasRules: false,
}));

const layout: PermissionLayout = {
  contentTypes: [
    {
      uid: ARTICLE,
      label: 'Article',
      kind: 'collectionType',
      actions,
      fields: [
        { name: 'title', label: 'title', type: 'string', required: false, engineOwned: false },
      ],
      locked: [],
      conditions: [],
    },
  ],
  groups: [],
};

const stored = (
  documentId: string,
  action: string,
  conditions: RolePermission['conditions'] = []
): RolePermission => ({
  documentId,
  action,
  subject: null,
  properties: { fields: ['title'] },
  conditions,
});

const snapshot = (rows: RolePermission[]): RoleSnapshot => ({
  name: 'Premium',
  description: null,
  requireTwoFactor: false,
  rows,
});

describe('describeSave', () => {
  it('describes what changes between the role as stored and as it will be', () => {
    const before = [stored('a', `${ARTICLE}.find`)];
    const after = [...before, stored('b', `${ARTICLE}.findOne`)];

    expect(describeSave(snapshot(before), snapshot(after), layout, before, [])).toEqual([
      {
        group: 'Article',
        changes: [
          { label: 'Find one', from: 'Not granted', to: 'Granted' },
          { label: 'Find one fields', added: ['title'] },
        ],
      },
    ]);
  });

  it('shows a removed row as removed, though the editor keeps it as stored', () => {
    // The row is refused by the server (its condition is gone), and the admin asks to remove it
    const refused = stored('r', `${ARTICLE}.findOne`, [{ name: 'api::gone' }]);
    const before = [stored('a', `${ARTICLE}.find`), refused];

    expect(describeSave(snapshot(before), snapshot(before), layout, before, ['r'])).toEqual([
      {
        group: 'Article',
        changes: [
          { label: 'Find one', from: 'Granted', to: 'Not granted' },
          { label: 'Find one fields', removed: ['title'] },
          { label: 'Find one conditions', removed: ['api::gone'] },
        ],
      },
    ]);
  });

  it('keeps a row that took the place of a removed one', () => {
    const refused = stored('r', `${ARTICLE}.findOne`, [{ name: 'api::gone' }]);
    const before = [refused];
    // The admin ticked the cell, which wrote a new row over the refused one
    const replacement = stored('', `${ARTICLE}.findOne`);

    expect(describeSave(snapshot(before), snapshot([replacement]), layout, before, ['r'])).toEqual([
      {
        group: 'Article',
        changes: [{ label: 'Find one conditions', removed: ['api::gone'] }],
      },
    ]);
  });

  it('lists a removed row of an action the layout lacks', () => {
    const gone = stored('g', 'api::gone.gone.find');
    const before = [stored('a', `${ARTICLE}.find`), gone];

    expect(describeSave(snapshot(before), snapshot(before), layout, before, ['g'])).toEqual([
      {
        group: 'Refused permissions',
        changes: [{ label: 'api::gone.gone.find', from: 'Refused by the server', to: 'Removed' }],
      },
    ]);
  });
});
