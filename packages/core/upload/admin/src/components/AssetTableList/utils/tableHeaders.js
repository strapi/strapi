import { getTrad } from '../../../utils';

export const tableHeaders = [
  {
    name: 'preview',
    key: 'preview',
    metadatas: {
      label: { id: getTrad('table-header-preview'), defaultMessage: 'preview' },
      sortable: false,
    },
  },
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: { id: getTrad('table-header-name'), defaultMessage: 'name' },
      sortable: true,
    },
  },
  {
    name: 'ext',
    key: 'extension',
    metadatas: {
      label: { id: getTrad('table-header-ext'), defaultMessage: 'extension' },
      sortable: false,
    },
  },
  {
    name: 'size',
    key: 'size',
    metadatas: {
      label: { id: getTrad('table-header-size'), defaultMessage: 'size' },
      sortable: false,
    },
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: { id: getTrad('table-header-createdAt'), defaultMessage: 'created' },
      sortable: true,
    },
  },
  {
    name: 'updatedAt',
    key: 'updatedAt',
    metadatas: {
      label: { id: getTrad('table-header-updatedAt'), defaultMessage: 'last update' },
      sortable: true,
    },
  },
];
