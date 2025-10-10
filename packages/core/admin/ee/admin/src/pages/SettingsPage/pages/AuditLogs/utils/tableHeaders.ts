import { SanitizedAdminUserForAuditLogs } from '../../../../../../../../shared/contracts/audit-logs';

export const tableHeaders = [
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
      sortable: false,
    },
    cellFormatter: (user: any) =>
      user ? (user as SanitizedAdminUserForAuditLogs).displayName : '',
  },
] as const;
