import {
  REVIEW_WORKFLOW_COLUMNS,
  REVIEW_WORKFLOW_FILTERS,
} from '../routes/content-manager/model/constants';

import type {
  InjectableListViewFilter,
  ListFieldLayout,
  ListLayout,
} from '@strapi/content-manager/strapi-admin';

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
