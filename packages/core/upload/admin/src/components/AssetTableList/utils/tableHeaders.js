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
      sortable: false,
    },
  },
  {
    name: 'extension',
    key: 'extension',
    metadatas: {
      label: { id: getTrad('table-header-extension'), defaultMessage: 'extension' },
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
    name: 'date',
    key: 'date',
    metadatas: {
      label: { id: getTrad('table-header-date'), defaultMessage: 'date' },
      sortable: false,
    },
  },
];
