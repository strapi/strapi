import {
  REVIEW_WORKFLOW_COLUMNS,
  REVIEW_WORKFLOW_FILTERS,
} from '../routes/content-manager/model/constants';

import type { Filters } from '@strapi/admin/strapi-admin';
import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';
import type { MessageDescriptor } from 'react-intl';

/** Matches CM list-view injectable filters (`Filters.tsx`): labels may be intl descriptors. */
type InjectableListViewFilter = Omit<Filters.Filter, 'label' | 'operators'> & {
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

/* -------------------------------------------------------------------------------------------------
 * addColumnToTableHook
 * -----------------------------------------------------------------------------------------------*/
interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

const addColumnToTableHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  const { options } = layout;

  if (!options.reviewWorkflows) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [...displayedHeaders, ...REVIEW_WORKFLOW_COLUMNS],
    layout,
  };
};

/* -------------------------------------------------------------------------------------------------
 * addFilterToListViewHook
 * -----------------------------------------------------------------------------------------------*/
interface AddFilterToListViewHookArgs {
  displayedFilters: InjectableListViewFilter[];
  layout: ListLayout;
}

const addFilterToListViewHook = ({ displayedFilters, layout }: AddFilterToListViewHookArgs) => {
  if (!layout?.options?.reviewWorkflows) {
    return { displayedFilters, layout };
  }

  return {
    displayedFilters: [...displayedFilters, ...REVIEW_WORKFLOW_FILTERS],
    layout,
  };
};

export { addColumnToTableHook, addFilterToListViewHook };
