import React from 'react';
import { useIntl } from 'react-intl';
import { LoadingIndicatorPage, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import useFetchEnabledPlugins from '../../hooks/useFetchEnabledPlugins';

const Plugins = () => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  useFocusWhenNavigate();

  const title = formatMessage({
    id: 'global.plugins',
    defaultMessage: 'Plugins',
  });

  const notifyPluginPageLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: title }
      )
    );
  };

  const { status, data } = useFetchEnabledPlugins(notifyPluginPageLoad);

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
          title={title}
          subtitle={formatMessage({
            id: 'app.components.ListPluginsPage.description',
            defaultMessage: 'List of the installed plugins in the project.',
          })}
        />
        <ContentLayout>
          <Table colCount={2} rowCount={data?.plugins.length + 1}>
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
              {data.plugins.map(({ name, displayName, description }) => {
                return (
                  <Tr key={name}>
                    <Td>
                      <Typography textColor="neutral800" variant="omega" fontWeight="bold">
                        {displayName}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">{description}</Typography>
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

export default Plugins;
