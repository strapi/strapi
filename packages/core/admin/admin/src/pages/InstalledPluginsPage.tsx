import * as React from 'react';

import {
  ContentLayout,
  HeaderLayout,
  Layout,
  Main,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  useNotifyAT,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
} from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../selectors';

const InstalledPluginsPage = () => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { get } = useFetchClient();
  useFocusWhenNavigate();

  const { status, data, error } = useQuery(['plugins'], async () => {
    /**
     * TODO: why is this a different format?
     */
    const { data } = await get<{
      plugins: Array<{ name: string; displayName: string; description: string }>;
    }>('/admin/plugins');

    return data;
  });

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
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    }
  }, [data, error, formatMessage, notifyStatus, toggleNotification]);

  const isLoading = status !== 'success' && status !== 'error';

  if (isLoading) {
    return (
      <Layout>
        <Main aria-busy>
          <LoadingIndicatorPage />
        </Main>
      </Layout>
    );
  }

  return (
    <Layout>
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: 'global.plugins',
            defaultMessage: 'Plugins',
          })}
          subtitle={formatMessage({
            id: 'app.components.ListPluginsPage.description',
            defaultMessage: 'List of the installed plugins in the project.',
          })}
        />
        <ContentLayout>
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
        </ContentLayout>
      </Main>
    </Layout>
  );
};

const ProtectedInstalledPluginsPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.marketplace?.main}>
      <Helmet
        title={formatMessage({
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        })}
      />
      <InstalledPluginsPage />
    </CheckPagePermissions>
  );
};

export { ProtectedInstalledPluginsPage, InstalledPluginsPage };
