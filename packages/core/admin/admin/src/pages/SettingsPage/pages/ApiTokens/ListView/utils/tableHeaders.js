const tableHeaders = [
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.name',
        defaultMessage: 'Name',
      },
      sortable: true,
    },
  },
  {
    name: 'description',
    key: 'description',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.description',
        defaultMessage: 'Description',
      },
      sortable: false,
    },
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.createdAt',
        defaultMessage: 'Created at',
      },
      sortable: false,
    },
  },
  {
    name: 'lastUsedAt',
    key: 'lastUsedAt',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.lastUsedAt',
        defaultMessage: 'Last used',
      },
      sortable: false,
    },
  },
];

export default tableHeaders;
