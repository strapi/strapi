import * as React from 'react';

import { Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';

/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/

const HomePageCE = () => {
  const { formatMessage } = useIntl();
  const user = useAuth('HomePageCE', (state) => state.user);
  const displayName = user?.firstname ?? user?.username ?? user?.email;

  return (
    <Main>
      <Page.Title>
        {formatMessage({ id: 'admin.pages.HomePage.title', defaultMessage: 'Home' })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage(
          { id: 'admin.pages.HomePage.header.title', defaultMessage: 'Hello {name}' },
          { name: displayName }
        )}
        subtitle={formatMessage({
          id: 'admin.pages.HomePage.header.subtitle',
          defaultMessage: 'Welcome to your administration panel',
        })}
      />
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HomePage
 * -----------------------------------------------------------------------------------------------*/

const HomePage = () => {
  const Page = useEnterprise(
    HomePageCE,
    // eslint-disable-next-line import/no-cycle
    async () => (await import('../../../../ee/admin/src/pages/HomePage')).HomePageEE
  );

  // block rendering until the EE component is fully loaded
  if (!Page) {
    return null;
  }

  return <Page />;
};

export { HomePage, HomePageCE };
