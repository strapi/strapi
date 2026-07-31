import { getTranslationKey } from '../../utils/translations';

export const localStorageKeys = {
  view: `STRAPI_UPLOAD_LIBRARY_VIEW`,
};

export const viewOptions = {
  GRID: 0,
  TABLE: 1,
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
  {
    name: 'createdAt',
    label: {
      id: getTranslationKey('list.table.header.creationDate'),
      defaultMessage: 'Creation Date',
    },
  },
  {
    name: 'updatedAt',
    label: {
      id: getTranslationKey('list.table.header.lastModified'),
      defaultMessage: 'Last Modified',
    },
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
