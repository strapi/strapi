import { getTrad } from '../../../utils';

export type SortOrder = 'ASC' | 'DESC';

export interface SortState {
  field: string;
  order: SortOrder;
}

export const DEFAULT_SORT: SortState = {
  field: 'updatedAt',
  order: 'DESC',
};

interface TableHeader {
  name: string;
  label: { id: string; defaultMessage: string };
  isSortable: boolean;
  isVisuallyHidden?: boolean;
}

export const TABLE_HEADERS: TableHeader[] = [
  {
    name: 'name',
    label: { id: getTrad('list.table.header.name'), defaultMessage: 'name' },
    isSortable: true,
  },
  // TODO translation keys
  {
    name: 'createdAt',
    label: { id: 'TODO: creation date', defaultMessage: 'creation date' },
    isSortable: true,
  },
  {
    name: 'updatedAt',
    label: { id: 'TODO: last modified', defaultMessage: 'last modified' },
    isSortable: false,
  },
  {
    name: 'size',
    label: { id: getTrad('list.table.header.size'), defaultMessage: 'size' },
    isSortable: false,
  },
  {
    name: 'actions',
    label: { id: getTrad('list.table.header.actions'), defaultMessage: 'actions' },
    isSortable: false,
    isVisuallyHidden: true,
  },
];
