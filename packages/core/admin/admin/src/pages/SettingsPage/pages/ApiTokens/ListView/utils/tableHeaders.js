const tableHeaders = [
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: 'Name',
      sortable: true,
    },
  },
  {
    name: 'description',
    key: 'description',
    metadatas: {
      label: 'Description',
      sortable: false,
    },
  },
  {
    name: 'type',
    key: 'type',
    metadatas: {
      label: 'Token type',
      sortable: false,
    },
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: 'Created at',
      sortable: false,
    },
  },
];

export default tableHeaders;
