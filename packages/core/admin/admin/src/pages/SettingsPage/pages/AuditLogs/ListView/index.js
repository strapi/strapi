import React, { useState } from 'react';
import { SettingsPageTitle, DynamicTable } from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { useIntl } from 'react-intl';
import TableRows from './DynamicTable/TableRows';
import tableHeaders from './utils/tableHeaders';
import ModalDialog from './ModalDialog';

const data = [
  {
    id: 1,
    action: 'Update',
    date: '2022-11-14T23:04:00.000Z',
    user: 'John Doe',
  },
  {
    id: 2,
    action: 'Create',
    date: '2022-11-04T18:24:00.000Z',
    user: 'Kai Doe',
  },
  {
    id: 3,
    action: 'Delete',
    date: '2022-10-09T11:26:00.000Z',
    user: 'John Doe',
  },
  {
    id: 4,
    action: 'Log in',
    date: '2022-10-09T11:24:00.000Z',
    user: 'Kai Doe',
  },
];

const ListView = () => {
  const { formatMessage } = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsActionData, setDetailsActionData] = useState(null);

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

    if (id) {
      const actionData = data.find((action) => action.id === id);
      setDetailsActionData(actionData);
    }
  };

  return (
    <Main>
      <SettingsPageTitle name={title} />
      <HeaderLayout
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.auditLogs.listview.header.subtitle',
          defaultMessage: 'Logs of all the activities that happened on your environment',
        })}
      />
      <ContentLayout>
        <DynamicTable contentType="Audit logs" headers={headers} rows={data} withBulkActions>
          <TableRows headers={headers} rows={data} onModalToggle={handleToggle} />
        </DynamicTable>
      </ContentLayout>
      {isModalOpen && <ModalDialog onToggle={handleToggle} data={detailsActionData} />}
    </Main>
  );
};

export default ListView;
