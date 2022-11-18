import React from 'react';
import { SettingsPageTitle } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { useIntl } from 'react-intl';

const ListView = () => {
  const { formatMessage } = useIntl();

  const title = formatMessage({
    id: 'global.auditLogs',
    defaultMessage: 'Audit Logs',
  });

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
    </Main>
  );
};

export default ListView;
