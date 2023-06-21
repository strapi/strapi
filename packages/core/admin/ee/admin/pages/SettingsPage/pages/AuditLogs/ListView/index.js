import React from 'react';

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
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import Filters from '../../../../../../../admin/src/pages/SettingsPage/components/Filters';
import adminPermissions from '../../../../../../../admin/src/permissions';

import useAuditLogsData from './hooks/useAuditLogsData';
import Modal from './Modal';
import PaginationFooter from './PaginationFooter';
import TableRows from './TableRows';
import getDisplayedFilters from './utils/getDisplayedFilters';
import tableHeaders from './utils/tableHeaders';

const auditLogsPermissions = {
  ...adminPermissions.settings.auditLogs,
  readUsers: adminPermissions.settings.users.read,
};

const ListView = () => {
  const { formatMessage } = useIntl();

  const {
    allowedActions: { canRead: canReadAuditLogs, canReadUsers },
  } = useRBAC(auditLogsPermissions);

  const [{ query }, setQuery] = useQueryParams();
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

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

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
      <ActionLayout startActions={<Filters displayedFilters={displayedFilters} />} />
      <ContentLayout canRead={canReadAuditLogs}>
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
            onOpenModal={(id) => setQuery({ id })}
          />
        </DynamicTable>
        <PaginationFooter pagination={auditLogs?.pagination} />
      </ContentLayout>
      {query?.id && <Modal handleClose={() => setQuery({ id: null }, 'remove')} logId={query.id} />}
    </Main>
  );
};

export default ListView;
