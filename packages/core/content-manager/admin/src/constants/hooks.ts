import type { Filters } from '@strapi/admin/strapi-admin';
import type { MessageDescriptor } from 'react-intl';

/**
 * Shape of a filter passed through the `INJECT_LIST_VIEW_FILTERS` hook.
 *
 * Plugin-injected filters may use react-intl `MessageDescriptor` labels so
 * they carry their own translations. The list view consumer resolves them to
 * plain strings (which is what the underlying `Filters.Filter` contract
 * expects) before rendering.
 */
export type InjectableListViewFilter = Omit<Filters.Filter, 'label' | 'operators'> & {
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

export const HOOKS = {
  /**
   * Hook that allows to mutate the displayed headers of the list view table
   * @constant
   * @type {string}
   */
  INJECT_COLUMN_IN_TABLE: 'Admin/CM/pages/ListView/inject-column-in-table',

  /**
   * Hook that allows to mutate the displayed filters of the list view
   * @constant
   * @type {string}
   */
  INJECT_LIST_VIEW_FILTERS: 'Admin/CM/pages/ListView/inject-in-filters',

  /**
   * Hook that allows to mutate the CM's collection types links pre-set filters
   * @constant
   * @type {string}
   */
  MUTATE_COLLECTION_TYPES_LINKS: 'Admin/CM/pages/App/mutate-collection-types-links',

  /**
   * Hook that allows to mutate the CM's edit view layout
   * @constant
   * @type {string}
   */
  MUTATE_EDIT_VIEW_LAYOUT: 'Admin/CM/pages/EditView/mutate-edit-view-layout',

  /**
   * Hook that allows to mutate the CM's single types links pre-set filters
   * @constant
   * @type {string}
   */
  MUTATE_SINGLE_TYPES_LINKS: 'Admin/CM/pages/App/mutate-single-types-links',
};
