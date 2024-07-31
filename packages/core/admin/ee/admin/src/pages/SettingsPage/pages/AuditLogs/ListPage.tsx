import {
  ActionLayout,
  Box,
  ContentLayout,
  HeaderLayout,
  Layout,
  Main,
} from '@strapi/design-system';
import {
  AnErrorOccurred,
  DynamicTable,
  SettingsPageTitle,
  useFocusWhenNavigate,
  useQueryParams,
  useRBAC,
  CheckPagePermissions,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { Filters } from '../../../../../../../admin/src/pages/Settings/components/Filters';
import { SanitizedAdminUserForAuditLogs } from '../../../../../../../shared/contracts/audit-logs';

import { Modal } from './components/Modal';
import { PaginationFooter } from './components/PaginationFooter';
import { TableHeader, TableRows } from './components/TableRows';
import { useAuditLogsData } from './hooks/useAuditLogsData';
import { getDisplayedFilters } from './utils/getDisplayedFilters';

const ListPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings);

  const {
    allowedActions: { canRead: canReadAuditLogs, canReadUsers },
    isLoading: isLoadingRBAC,
  } = useRBAC({
    ...permissions?.auditLogs,
    readUsers: permissions?.users.read || [],
  });

  const [{ query }, setQuery] = useQueryParams<{ id?: string | null }>();
  const {
    auditLogs,
    users,
    isLoading: isLoadingData,
    hasError,
  } = useAuditLogsData({
    canReadAuditLogs,
    canReadUsers,
  });

  useFocusWhenNavigate();

  const displayedFilters = getDisplayedFilters({ formatMessage, users, canReadUsers });

  const headers = [
    {
      name: 'action',
      key: 'action',
      metadatas: {
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.action',
          defaultMessage: 'Action',
        }),
        sortable: true,
      },
    },
    {
      name: 'date',
      key: 'date',
      metadatas: {
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.date',
          defaultMessage: 'Date',
        }),
        sortable: true,
      },
    },
    {
      key: 'user',
      name: 'user',
      metadatas: {
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.user',
          defaultMessage: 'User',
        }),
        sortable: false,
      },
      // In this case, the passed parameter cannot and shouldn't be something else than User
      cellFormatter: (user) => (user ? (user as SanitizedAdminUserForAuditLogs).displayName : ''),
    },
  ] satisfies TableHeader[];

  if (hasError) {
    return (
      <Layout>
        <ContentLayout>
          <Box paddingTop={8}>
            <AnErrorOccurred />
          </Box>
        </ContentLayout>
      </Layout>
    );
  }

  const isLoading = isLoadingData || isLoadingRBAC;

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle
        name={formatMessage({
          id: 'global.auditLogs',
          defaultMessage: 'Audit Logs',
        })}
      />
      <HeaderLayout
        title={formatMessage({
          id: 'global.auditLogs',
          defaultMessage: 'Audit Logs',
        })}
        subtitle={formatMessage({
          id: 'Settings.permissions.auditLogs.listview.header.subtitle',
          defaultMessage: 'Logs of all the activities that happened in your environment',
        })}
      />
      <ActionLayout startActions={<Filters displayedFilters={displayedFilters} />} />
      <ContentLayout>
        <DynamicTable
          contentType="Audit logs"
          headers={headers}
          rows={auditLogs?.results || []}
          withBulkActions
          isLoading={isLoading}
        >
          <TableRows
            headers={headers}
            rows={auditLogs?.results || []}
            onOpenModal={(id) => setQuery({ id: `${id}` })}
          />
        </DynamicTable>
        {auditLogs?.pagination && <PaginationFooter pagination={auditLogs.pagination} />}
      </ContentLayout>
      {query?.id && <Modal handleClose={() => setQuery({ id: null }, 'remove')} logId={query.id} />}
    </Main>
  );
};

const ProtectedListPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.auditLogs?.main
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ListPage />
    </CheckPagePermissions>
  );
};

export { ListPage, ProtectedListPage };
