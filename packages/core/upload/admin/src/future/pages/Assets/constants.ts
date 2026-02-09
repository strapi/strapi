import { getTranslationKey } from '../../utils/translations';

export const localStorageKeys = {
  view: `STRAPI_UPLOAD_LIBRARY_VIEW`,
};

export const viewOptions = {
  GRID: 0,
  LIST: 1,
};

interface TableHeader {
  name: string;
  label: { id: string; defaultMessage: string };
  isVisuallyHidden?: boolean;
}

export const TABLE_HEADERS: TableHeader[] = [
  {
    name: 'name',
    label: { id: getTranslationKey('list.table.header.name'), defaultMessage: 'name' },
  },
  // TODO translation keys
  {
    name: 'createdAt',
    label: { id: 'TODO: creation date', defaultMessage: 'creation date' },
  },
  {
    name: 'updatedAt',
    label: { id: 'TODO: last modified', defaultMessage: 'last modified' },
  },
  {
    name: 'size',
    label: { id: getTranslationKey('list.table.header.size'), defaultMessage: 'size' },
  },
  {
    name: 'actions',
    label: { id: getTranslationKey('list.table.header.actions'), defaultMessage: 'actions' },
    isVisuallyHidden: true,
  },
];
