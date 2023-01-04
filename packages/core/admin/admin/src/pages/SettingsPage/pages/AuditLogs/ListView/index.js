import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import {
  SettingsPageTitle,
  DynamicTable,
  useRBAC,
  useNotification,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import adminPermissions from '../../../../../permissions';
// import { useFetchClient } from '../../../../../hooks';
import TableRows from './DynamicTable/TableRows';
import tableHeaders from './utils/tableHeaders';
import { fetchAuditLogsPage, fetchAuditLog } from './utils/api';
import ModalDialog from './ModalDialog';

const ListView = () => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canRead },
  } = useRBAC(adminPermissions.settings.auditLogs);

  useFocusWhenNavigate();

  /**
   * TODO: using fetchclient facing difficulties to mock, for time being using axiosinstance to pass the tests
   *
  const { get } = useFetchClient();
  const fetchData = async () => {
    const {
      data: { results },
    } = await get(`/admin/audit-logs`);

    return results;
  }; */

  const { status, data, isFetching } = useQuery('audit-logs', fetchAuditLogsPage, {
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20,
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const isLoading = status === 'loading' || isFetching;

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

  const [openedLogId, setOpenedLogId] = useState(null);
  const { data: openedLogData, status: openedLogStatus } = useQuery(
    ['audit-log', openedLogId],
    () => fetchAuditLog(openedLogId),
    {
      enabled: !!openedLogId,
    }
  );

  console.log({ openedLogData, openedLogId });

  const handleToggle = (id) => {
    // Either saves the id of the log to open or closes the modal
    setOpenedLogId(id);
  };

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
      <ContentLayout>
        <DynamicTable
          contentType="Audit logs"
          headers={headers}
          rows={data}
          withBulkActions
          isLoading={isLoading}
        >
          <TableRows headers={headers} rows={data} onModalToggle={handleToggle} />
        </DynamicTable>
      </ContentLayout>
      {openedLogId && openedLogStatus === 'success' && (
        <ModalDialog onToggle={handleToggle} data={openedLogData} />
      )}
    </Main>
  );
};

export default ListView;
