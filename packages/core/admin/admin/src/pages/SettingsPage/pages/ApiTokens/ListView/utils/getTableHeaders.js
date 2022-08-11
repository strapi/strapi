const getTableHeaders = formatMessage => [
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: formatMessage({
        id: 'Settings.apiTokens.ListView.headers.name',
        defaultMessage: 'Name',
      }),
      sortable: true,
    },
  },
  {
    name: 'description',
    key: 'description',
    metadatas: {
      label: formatMessage({
        id: 'Settings.apiTokens.ListView.headers.description',
        defaultMessage: 'Description',
      }),
      sortable: false,
    },
  },
  {
    name: 'type',
    key: 'type',
    metadatas: {
      label: formatMessage({
        id: 'Settings.apiTokens.ListView.headers.type',
        defaultMessage: 'Token type',
      }),
      sortable: false,
    },
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: formatMessage({
        id: 'Settings.apiTokens.ListView.headers.createdAt',
        defaultMessage: 'Created at',
      }),
      sortable: false,
    },
  },
];

export default getTableHeaders;
