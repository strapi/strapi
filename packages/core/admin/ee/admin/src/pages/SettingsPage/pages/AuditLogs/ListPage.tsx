import { ActionLayout, ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { DynamicTable, useFocusWhenNavigate, useQueryParams, useRBAC } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';

import { Filters } from '../../../../../../../admin/src/components/Filters';
import { Page } from '../../../../../../../admin/src/components/PageHelpers';
import { Pagination } from '../../../../../../../admin/src/components/Pagination';
import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { SanitizedAdminUserForAuditLogs } from '../../../../../../../shared/contracts/audit-logs';

import { Modal } from './components/Modal';
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
    return <Page.Error />;
  }

  const isLoading = isLoadingData || isLoadingRBAC;

  return (
    <Main aria-busy={isLoading}>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: 'global.auditLogs',
              defaultMessage: 'Audit Logs',
            }),
          }
        )}
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
      <ActionLayout
        startActions={
          <Filters.Root options={displayedFilters}>
            <Filters.Trigger />
            <Filters.Popover />
            <Filters.List />
          </Filters.Root>
        }
      />
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
        <Pagination.Root {...auditLogs?.pagination} defaultPageSize={24}>
          <Pagination.PageSize options={['12', '24', '50', '100']} />
          <Pagination.Links />
        </Pagination.Root>
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
    <Page.Protect permissions={permissions}>
      <ListPage />
    </Page.Protect>
  );
};

export { ListPage, ProtectedListPage };
