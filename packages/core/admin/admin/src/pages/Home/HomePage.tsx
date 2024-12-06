import * as React from 'react';

import { Box, Main } from '@strapi/design-system';
import { House } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';

import { GuidedTour } from './components/GuidedTour';
import { Widget } from './components/Widget';

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
        {formatMessage({ id: 'HomePage.head.title', defaultMessage: 'Homepage' })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage(
          { id: 'HomePage.header.title', defaultMessage: 'Hello {name}' },
          { name: displayName }
        )}
        subtitle={formatMessage({
          id: 'HomePage.header.subtitle',
          defaultMessage: 'Welcome to your administration panel',
        })}
      />
      <Layouts.Content>
        <GuidedTour />
        {/* TODO remove this fake widget when we add the first real one */}
        <Widget title={{ defaultMessage: 'Dummy widget', id: 'notarealid' }} icon={House}>
          <Box background="danger200" height="2000px">
            This is a widget!
          </Box>
        </Widget>
      </Layouts.Content>
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
