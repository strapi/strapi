import * as React from 'react';

import { Box, Flex, Grid, Main, Typography } from '@strapi/design-system';
import { PuzzlePiece } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';

import { GuidedTourHomepageOverview } from '../../components/GuidedTour/Overview';
import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { Widget } from '../../components/WidgetHelpers';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';
import { useStrapiApp } from '../../features/StrapiApp';
import { useTracking } from '../../features/Tracking';

import { FreeTrialEndedModal } from './components/FreeTrialEndedModal';
import { FreeTrialWelcomeModal } from './components/FreeTrialWelcomeModal';

import type { WidgetWithUID } from '../../core/apis/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * WidgetRoot
 * -----------------------------------------------------------------------------------------------*/

interface WidgetRootProps
  extends Pick<WidgetType, 'title' | 'icon' | 'permissions' | 'link' | 'uid'> {
  children: React.ReactNode;
}

export const WidgetRoot = ({ title, icon = PuzzlePiece, children, link, uid }: WidgetRootProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const id = React.useId();
  const Icon = icon;

  const handleClickOnLink = () => {
    trackUsage('didOpenHomeWidgetLink', { widgetUID: uid });
  };

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
      <Flex direction="row" gap={2} justifyContent="space-between" width="100%" tag="header">
        <Flex gap={2}>
          <Icon fill="neutral500" aria-hidden />
          <Typography textColor="neutral500" variant="sigma" tag="h2" id={id}>
            {formatMessage(title)}
          </Typography>
        </Flex>
        {link && (
          <Typography
            tag={ReactRouterLink}
            variant="omega"
            textColor="primary600"
            style={{ textDecoration: 'none' }}
            textAlign="right"
            to={link.href}
            onClick={handleClickOnLink}
          >
            {formatMessage(link.label)}
          </Typography>
        )}
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

/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/

const HomePageCE = () => {
  const { formatMessage } = useIntl();
  const user = useAuth('HomePageCE', (state) => state.user);
  const displayName = user?.firstname ?? user?.username ?? user?.email;
  const getAllWidgets = useStrapiApp('UnstableHomepageCe', (state) => state.widgets.getAll);
  const checkUserHasPermissions = useAuth('WidgetRoot', (state) => state.checkUserHasPermissions);
  const [filteredWidgets, setFilteredWidgets] = React.useState<WidgetWithUID[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkWidgetsPermissions = async () => {
      const allWidgets = getAllWidgets();
      const authorizedWidgets = await Promise.all(
        allWidgets.map(async (widget) => {
          if (!widget.permissions || widget.permissions.length === 0) return true;
          const matchingPermissions = await checkUserHasPermissions(widget.permissions);
          return matchingPermissions.length >= widget.permissions.length;
        })
      );
      setFilteredWidgets(allWidgets.filter((_, i) => authorizedWidgets[i]));
      setLoading(false);
    };

    checkWidgetsPermissions();
  }, [checkUserHasPermissions, getAllWidgets]);

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
      <FreeTrialWelcomeModal />
      <FreeTrialEndedModal />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={8} paddingBottom={10}>
          <GuidedTourHomepageOverview />
          {loading ? (
            <Box position="absolute" top={0} left={0} right={0} bottom={0}>
              <Page.Loading />
            </Box>
          ) : (
            <Grid.Root gap={5}>
              {filteredWidgets.map((widget) => (
                <Grid.Item col={6} s={12} key={widget.uid}>
                  <WidgetRoot
                    title={widget.title}
                    icon={widget.icon}
                    link={widget.link}
                    uid={widget.uid}
                  >
                    <WidgetComponent component={widget.component} />
                  </WidgetRoot>
                </Grid.Item>
              ))}
            </Grid.Root>
          )}
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
