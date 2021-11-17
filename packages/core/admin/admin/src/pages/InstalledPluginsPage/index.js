import React from 'react';
import { CheckPagePermissions, NoContent } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import adminPermissions from '../../permissions';

const InstalledPluginsPage = () => {
  const { formatMessage } = useIntl();

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Layout>
        <Main>
          <HeaderLayout
            title={formatMessage({
              id: 'app.components.ListPluginsPage.helmet.title',
              defaultMessage: 'List plugins',
            })}
          />
          <ContentLayout>
            <NoContent
              content={{
                id: 'coming.soon',
                defaultMessage:
                  'This content is currently under construction and will be back in a few weeks!',
              }}
            />
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default InstalledPluginsPage;
