import React from 'react';
import { useIntl } from 'react-intl';
import { LoadingIndicatorPage, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import useFetchInstalledPlugins from '../../hooks/useFetchInstalledPlugins';

const Plugins = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  const title = formatMessage({
    id: 'app.components.ListPluginsPage.title',
    defaultMessage: 'Plugins',
  });

  const { status, data } = useFetchInstalledPlugins(title);

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
                      id: 'Settings.roles.list.header.name',
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: 'Settings.roles.list.header.description',
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
