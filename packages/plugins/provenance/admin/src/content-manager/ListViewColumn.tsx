import { getTranslation } from '../utils/translations';

import { ListViewCell } from './ListViewCell';

type Header = Record<string, unknown>;

/**
 * Adds an "AI content" column to the list view of API content types.
 */
export const addColumnToTableHook = <TArgs extends { displayedHeaders: Header[] }>(
  args: TArgs
): TArgs => {
  // The hook does not receive the content type: the list view URL carries it
  const model = decodeURIComponent(
    window.location.pathname.match(/\/collection-types\/([^/]+)/)?.[1] ?? ''
  );

  if (!model.startsWith('api::')) {
    return args;
  }

  return {
    ...args,
    displayedHeaders: [
      ...args.displayedHeaders,
      {
        attribute: { type: 'string' },
        label: { id: getTranslation('list.column'), defaultMessage: 'AI content' },
        searchable: false,
        sortable: false,
        name: 'provenance',
        cellFormatter: (row: { documentId: string }, _header: unknown, meta: { model: string }) => (
          <ListViewCell row={row} model={meta.model} />
        ),
      },
    ],
  };
};
