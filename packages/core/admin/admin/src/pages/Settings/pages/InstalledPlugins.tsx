import * as React from 'react';

import { Table, Tbody, Td, Th, Thead, Tr, Typography, useNotifyAT } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';
import { Page } from '../../../components/PageHelpers';
import { useTypedSelector } from '../../../core/store/hooks';
import { useNotification } from '../../../features/Notifications';
import { useAPIErrorHandler } from '../../../hooks/useAPIErrorHandler';
import { useGetPluginsQuery } from '../../../services/admin';

const InstalledPlugins = () => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { isLoading, data, error } = useGetPluginsQuery();

  React.useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage(
          {
            id: 'app.utils.notify.data-loaded',
            defaultMessage: 'The {target} has loaded',
          },
          {
            target: formatMessage({
              id: 'global.plugins',
              defaultMessage: 'Plugins',
            }),
          }
        )
      );
    }

    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [data, error, formatAPIError, formatMessage, notifyStatus, toggleNotification]);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Main>
        <Layouts.Header
          title={formatMessage({
            id: 'global.plugins',
            defaultMessage: 'Plugins',
          })}
          subtitle={formatMessage({
            id: 'app.components.ListPluginsPage.description',
            defaultMessage: 'List of the installed plugins in the project.',
          })}
        />
        <Layouts.Content>
          <Table colCount={2} rowCount={data?.plugins?.length ?? 0 + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: 'global.name',
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: 'global.description',
                      defaultMessage: 'description',
                    })}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.plugins.map(({ name, displayName, description }) => {
                return (
                  <Tr key={name}>
                    <Td>
                      <Typography textColor="neutral800" variant="omega" fontWeight="bold">
                        {formatMessage({
                          id: `global.plugins.${name}`,
                          defaultMessage: displayName,
                        })}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">
                        {formatMessage({
                          id: `global.plugins.${name}.description`,
                          defaultMessage: description,
                        })}
                      </Typography>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Layouts.Content>
      </Page.Main>
    </Layouts.Root>
  );
};

const ProtectedInstalledPlugins = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);

  return (
    <Page.Protect permissions={permissions.marketplace?.main}>
      <Page.Title>
        {formatMessage({
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        })}
      </Page.Title>
      <InstalledPlugins />
    </Page.Protect>
  );
};

export { ProtectedInstalledPlugins, InstalledPlugins };
