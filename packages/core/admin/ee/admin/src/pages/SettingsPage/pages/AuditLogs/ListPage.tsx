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
import { useSelector } from 'react-redux';

import { Filters } from '../../../../../../../admin/src/pages/Settings/components/Filters';
import { selectAdminPermissions } from '../../../../../../../admin/src/selectors';
import { SanitizedAdminUserForAuditLogs } from '../../../../../../../shared/contracts/audit-logs';

import { Modal } from './components/Modal';
import { PaginationFooter } from './components/PaginationFooter';
import { TableHeader, TableRows } from './components/TableRows';
import { useAuditLogsData } from './hooks/useAuditLogsData';
import { getDisplayedFilters } from './utils/getDisplayedFilters';

export const ListView = () => {
  const { formatMessage } = useIntl();
  const permissions = useSelector(selectAdminPermissions);

  const {
    allowedActions: { canRead: canReadAuditLogs, canReadUsers },
  } = useRBAC({
    ...permissions.settings?.auditLogs,
    readUsers: permissions.settings?.users.read || [],
  });

  const [{ query }, setQuery] = useQueryParams<{ id?: string | null }>();
  const { auditLogs, users, isLoading, hasError } = useAuditLogsData({
    canReadAuditLogs,
    canReadUsers,
  });

  useFocusWhenNavigate();

  const displayedFilters = getDisplayedFilters({ formatMessage, users, canReadUsers });

  const title = formatMessage({
    id: 'global.auditLogs',
    defaultMessage: 'Audit Logs',
  });

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

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name={title} />
      <HeaderLayout
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.auditLogs.listview.header.subtitle',
          defaultMessage: 'Logs of all the activities that happened in your environment',
        })}
      />
      {/* @ts-expect-error – TODO: fix the way filters work and are passed around, this will be a headache. */}
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

export const ProtectedAuditLogsListPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.auditLogs?.main}>
      <ListView />
    </CheckPagePermissions>
  );
};
