const tableHeaders = [
  {
    name: 'action',
    key: 'action',
    metadatas: {
      label: {
        id: 'Settings.permissions.auditLogs.action',
        defaultMessage: 'Action',
      },
      sortable: true,
    },
  },
  {
    name: 'date',
    key: 'date',
    metadatas: {
      label: {
        id: 'Settings.permissions.auditLogs.date',
        defaultMessage: 'Date',
      },
      sortable: true,
    },
  },
  {
    key: 'user',
    name: 'user',
    metadatas: {
      label: {
        id: 'Settings.permissions.auditLogs.user',
        defaultMessage: 'User',
      },
      sortable: true,
    },
  },
];

export default tableHeaders;
