import { sameRow, describeChanges } from './editorModel';

import type { ChangeGroup, RoleSnapshot } from './editorModel';
import type { PermissionLayout, RolePermission } from '../../../../../shared/contracts/permissions';

const REFUSED_GROUP = 'Refused permissions';

/**
 * What a save changes, for the review before it: `describeChanges` between the role as stored and
 * as it will be, with what it leaves out. A row the admin asked to remove is set aside by the
 * editor and kept in `after`, so it is left out of there to show as removed; and a removed row of an
 * action the layout lacks (the content type is gone) is not described at all, so it is listed here.
 */
const describeSave = (
  before: RoleSnapshot,
  after: RoleSnapshot,
  layout: PermissionLayout,
  stored: RolePermission[],
  remove: string[]
): ChangeGroup[] => {
  const removed = stored.filter(({ documentId }) => remove.includes(documentId));
  // A row of `after` that is the removed one as it was stored is kept by the editor; one that is
  // not (the admin ticked its cell, which wrote over it) is a new row
  const kept = after.rows.filter((row) => !removed.some((old) => sameRow(old, row, layout)));
  const groups = describeChanges(before, { ...after, rows: kept }, layout);

  const known = new Set([
    ...layout.contentTypes.flatMap(({ actions }) => actions.map(({ actionId }) => actionId)),
    ...layout.groups.flatMap(({ categories }) =>
      categories.flatMap(({ routes }) => routes.map(({ actionId }) => actionId))
    ),
  ]);
  const unseen = removed.filter(({ action }) => !known.has(action));

  return unseen.length === 0
    ? groups
    : [
        ...groups,
        {
          group: REFUSED_GROUP,
          changes: unseen.map(({ action }) => ({
            label: action,
            from: 'Refused by the server',
            to: 'Removed',
          })),
        },
      ];
};

export { describeSave };
