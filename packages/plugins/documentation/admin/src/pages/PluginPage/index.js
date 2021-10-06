/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { CheckPermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Layout, HeaderLayout, Main, Button, ContentLayout } from '@strapi/parts';
import ShowIcon from '@strapi/icons/Show';

import permissions from '../../permissions';
import { getTrad } from '../../utils';
import openWithNewTab from '../../utils/openWithNewTab';
import useHomePage from '../HomePage/useHomePage';

const PluginPage = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useHomePage();

  const slash = data?.prefix.startsWith('/') ? '' : '/';

  return (
    <Layout>
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('plugin.name'),
            defaultMessage: 'Documentation',
          })}
          subtitle={formatMessage({
            id: getTrad('pages.PluginPage.header.description'),
            defaultMessage: 'Configure the documentation plugin',
          })}
          primaryAction={
            //  eslint-disable-next-line
            <CheckPermissions permissions={permissions.open}>
              <Button
                onClick={() => openWithNewTab(`${slash}${data.prefix}/v${data.currentVersion}`)}
                startIcon={<ShowIcon />}
              >
                {formatMessage({
                  id: getTrad('pages.PluginPage.Button.open'),
                  defaultMessage: 'Open Documentation',
                })}
              </Button>
            </CheckPermissions>
          }
        />
        <ContentLayout>
          {isLoading && <LoadingIndicatorPage>Plugin is loading</LoadingIndicatorPage>}
        </ContentLayout>
      </Main>
    </Layout>
  );
};

export default PluginPage;
