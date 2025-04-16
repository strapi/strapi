import * as React from 'react';

import { Box, Flex, Grid, Main, Typography } from '@strapi/design-system';
import { CheckCircle, Pencil, PuzzlePiece } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';

import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { Widget } from '../../components/WidgetHelpers';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';
import { useStrapiApp } from '../../features/StrapiApp';

import { LastEditedWidget, LastPublishedWidget } from './components/ContentManagerWidgets';
import { GuidedTour } from './components/GuidedTour';

/* -------------------------------------------------------------------------------------------------
 * WidgetRoot
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  title: MessageDescriptor;
  icon?: typeof import('@strapi/icons').PuzzlePiece;
  children: React.ReactNode;
}

export const WidgetRoot = ({ title, icon = PuzzlePiece, children }: RootProps) => {
  const { formatMessage } = useIntl();
  const id = React.useId();
  const Icon = icon;

  return (
    <Flex
      width="100%"
      hasRadius
      direction="column"
      alignItems="flex-start"
      background="neutral0"
      borderColor="neutral150"
      shadow="tableShadow"
      tag="section"
      gap={4}
      padding={6}
      aria-labelledby={id}
    >
      <Flex direction="row" alignItems="center" gap={2} tag="header">
        <Icon fill="neutral500" aria-hidden />
        <Typography textColor="neutral500" variant="sigma" tag="h2" id={id}>
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Box width="100%" height="261px" overflow="auto" tag="main">
        {children}
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UnstableHomePageCe
 * -----------------------------------------------------------------------------------------------*/

const WidgetComponent = ({ component }: { component: () => Promise<React.ComponentType> }) => {
  const [loadedComponent, setLoadedComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    const loadComponent = async () => {
      const resolvedComponent = await component();

      setLoadedComponent(() => resolvedComponent);
    };

    loadComponent();
  }, [component]);

  const Component = loadedComponent;

  if (!Component) {
    return <Widget.Loading />;
  }

  return <Component />;
};

const UnstableHomePageCe = () => {
  const { formatMessage } = useIntl();
  const user = useAuth('HomePageCE', (state) => state.user);
  const displayName = user?.firstname ?? user?.username ?? user?.email;
  const getAllWidgets = useStrapiApp('UnstableHomepageCe', (state) => state.widgets.getAll);

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
        <Flex direction="column" alignItems="stretch" gap={8} paddingBottom={10}>
          <GuidedTour />
          <Grid.Root gap={5}>
            {getAllWidgets().map((widget) => {
              return (
                <Grid.Item col={6} s={12} key={widget.uid}>
                  <WidgetRoot title={widget.title} icon={widget.icon}>
                    <WidgetComponent component={widget.component} />
                  </WidgetRoot>
                </Grid.Item>
              );
            })}
          </Grid.Root>
        </Flex>
      </Layouts.Content>
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/

const HomePageCE = () => {
  const { formatMessage } = useIntl();
  const user = useAuth('HomePageCE', (state) => state.user);
  const displayName = user?.firstname ?? user?.username ?? user?.email;

  if (window.strapi.future.isEnabled('unstableWidgetsApi')) {
    return <UnstableHomePageCe />;
  }

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
        <Flex direction="column" alignItems="stretch" gap={8} paddingBottom={10}>
          <GuidedTour />
          <Grid.Root gap={5}>
            <Grid.Item col={6} s={12}>
              <WidgetRoot
                title={{
                  id: 'content-manager.widget.last-edited.title',
                  defaultMessage: 'Last edited entries',
                }}
                icon={Pencil}
              >
                <LastEditedWidget />
              </WidgetRoot>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <WidgetRoot
                title={{
                  id: 'content-manager.widget.last-published.title',
                  defaultMessage: 'Last published entries',
                }}
                icon={CheckCircle}
              >
                <LastPublishedWidget />
              </WidgetRoot>
            </Grid.Item>
          </Grid.Root>
        </Flex>
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
