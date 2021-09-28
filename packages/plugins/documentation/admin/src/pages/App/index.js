/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { CheckPagePermissions, NoContent } from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import pluginPermissions from '../../permissions';
import { getTrad } from '../../utils';
// import HomePage from '../HomePage';

const ComingSoon = () => {
  const { formatMessage } = useIntl();

  return (
    <Layout>
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('plugin.name'),
            defaultMessage: 'Documentation',
          })}
        />
        <ContentLayout>
          <NoContent
            content={{
              id: getTrad('coming.soon'),
              defaultMessage:
                'This content is currently under construction and will be back in a few weeks!',
            }}
          />
        </ContentLayout>
      </Main>
    </Layout>
  );
};

function App() {
  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      {/* <HomePage /> */}
      <ComingSoon />
    </CheckPagePermissions>
  );
}

export default App;
