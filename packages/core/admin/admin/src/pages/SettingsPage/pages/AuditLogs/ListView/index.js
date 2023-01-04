import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  DynamicTable,
  useRBAC,
  useNotification,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import adminPermissions from '../../../../../permissions';
import { useFetchClient } from '../../../../../hooks';
import TableRows from './DynamicTable/TableRows';
import tableHeaders from './utils/tableHeaders';
import ModalDialog from './ModalDialog';

const ListView = () => {
  const { formatMessage } = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsActionData, setDetailsActionData] = useState(null);
  const toggleNotification = useNotification();
  const {
    allowedActions: { canRead },
  } = useRBAC(adminPermissions.settings.auditLogs);
  const { get } = useFetchClient();
  const { search } = useLocation();

  useFocusWhenNavigate();

  const fetchData = async ({ queryKey }) => {
    const [, search] = queryKey;
    const { data } = await get('/admin/audit-logs', { params: { ...search } });

    return data;
  };

  const { data, isLoading } = useQuery(['auditLogs', search], fetchData, {
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

  const handleToggle = (id) => {
    setIsModalOpen((prev) => !prev);

    if (data.results && id) {
      const actionData = data.results.find((action) => action.id === id);
      setDetailsActionData(actionData);
    }
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
      <ContentLayout canRead={canRead}>
        <DynamicTable
          contentType="Audit logs"
          headers={headers}
          rows={data?.results || []}
          withBulkActions
          isLoading={isLoading}
        >
          <TableRows headers={headers} rows={data?.results || []} onModalToggle={handleToggle} />
        </DynamicTable>
      </ContentLayout>
      {isModalOpen && <ModalDialog onToggle={handleToggle} data={detailsActionData} />}
    </Main>
  );
};

export default ListView;
