/* eslint-disable check-file/filename-naming-convention */
import { SpaceListCell } from '../components/SpaceListCell';
import { ALL_SPACES } from '../constants';
import { getSelectedSpace } from '../selectedSpace';
import { getTranslation } from '../utils/getTranslation';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

/**
 * Adds a "Space" column to the Content Manager's list, but only in the
 * all-spaces view.
 *
 * Inside a space every row has the same owner, so the column would repeat the
 * same value and cost a lookup for nothing. Across spaces it is the one thing
 * the list cannot otherwise tell you.
 */
const addSpaceColumnHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  if (getSelectedSpace() !== ALL_SPACES) {
    return { displayedHeaders, layout };
  }

  return {
    layout,
    displayedHeaders: [
      ...displayedHeaders,
      {
        attribute: { type: 'string' },
        label: {
          id: getTranslation('list.column'),
          defaultMessage: 'Space',
        },
        searchable: false,
        sortable: false,
        name: 'space',
        // @ts-expect-error – the cell formatter's props are typed more loosely
        // than the layout they are declared in.
        cellFormatter: (props) => <SpaceListCell documentId={props.documentId} />,
      },
    ],
  };
};

export { addSpaceColumnHook };
