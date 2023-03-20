import React from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  DynamicTable,
  useRBAC,
  useFocusWhenNavigate,
  useQueryParams,
  AnErrorOccurred,
} from '@strapi/helper-plugin';
import {
  Box,
  HeaderLayout,
  ContentLayout,
  ActionLayout,
  Layout,
  Main,
} from '@strapi/design-system';
import adminPermissions from '../../../../../../../admin/src/permissions';
import TableRows from './TableRows';
import tableHeaders from './utils/tableHeaders';
import PaginationFooter from './PaginationFooter';
import Modal from './Modal';
import Filters from '../../../../../../../admin/src/pages/SettingsPage/components/Filters';
import getDisplayedFilters from './utils/getDisplayedFilters';
import useAuditLogsData from './hooks/useAuditLogsData';

const ListView = () => {
  const { formatMessage } = useIntl();
  const {
    allowedActions: { canRead },
  } = useRBAC(adminPermissions.settings.auditLogs);
  const [{ query }, setQuery] = useQueryParams();
  const { auditLogs, users, isLoading, hasError } = useAuditLogsData({ canRead });

  useFocusWhenNavigate();

  const displayedFilters = getDisplayedFilters({ formatMessage, users });

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
      <ContentLayout canRead={canRead}>
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
