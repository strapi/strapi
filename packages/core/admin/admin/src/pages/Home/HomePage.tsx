import * as React from 'react';

import { Box, Button, Flex, Grid, Main } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';

import { GuidedTourHomepageOverview } from '../../components/GuidedTour/Overview';
import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { Widget } from '../../components/WidgetHelpers';
import { GapDropZone } from '../../components/Widgets';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';
import { useStrapiApp } from '../../features/StrapiApp';
import { useWidgets } from '../../features/Widgets';

import { AddWidgetModal } from './components/AddWidgetModal';
import { FreeTrialEndedModal } from './components/FreeTrialEndedModal';
import { FreeTrialWelcomeModal } from './components/FreeTrialWelcomeModal';

import type { WidgetWithUID } from '../../core/apis/Widgets';

/* -------------------------------------------------------------------------------------------------
 * UnstableHomePageCe
 * -----------------------------------------------------------------------------------------------*/

export const WidgetComponent = ({
  component,
  columnWidth,
}: {
  component: () => Promise<React.ComponentType>;
  columnWidth: number;
}) => {
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

  return <Component {...({ columnWidth } as any)} />;
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
  const [allAvailableWidgets, setAllAvailableWidgets] = React.useState<WidgetWithUID[]>([]);
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
      const authorizedWidgetsList = allWidgets.filter((_, i) => authorizedWidgets[i]);
      setFilteredWidgets(authorizedWidgetsList);
      setAllAvailableWidgets(authorizedWidgetsList);
      setLoading(false);
    };

    checkWidgetsPermissions();
  }, [checkUserHasPermissions, getAllWidgets]);

  // Use custom hook for widget management
  const {
    findWidget,
    moveWidget,
    handleDropWidget,
    deleteWidget,
    addWidget,
    widgetLayout,
    columnWidths,
    setColumnWidths,
    WidgetRoot,
  } = useWidgets({
    filteredWidgets,
    setFilteredWidgets,
  });

  const [, drop] = useDrop(() => ({ accept: 'widget' }));

  // Add Widget Modal state
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = React.useState(false);

  const handleAddWidget = (widget: WidgetWithUID) => {
    addWidget(widget);
    // Set default width for the new widget
    setColumnWidths((prev) => ({
      ...prev,
      [widget.uid]: 6,
    }));
  };

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
        primaryAction={
          <Button
            variant="tertiary"
            size="S"
            startIcon={<Plus />}
            onClick={() => setIsAddWidgetModalOpen(true)}
          >
            {formatMessage({
              id: 'HomePage.addWidget.button',
              defaultMessage: 'Add Widget',
            })}
          </Button>
        }
      />
      <FreeTrialWelcomeModal />
      <FreeTrialEndedModal />
      <AddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        onAddWidget={handleAddWidget}
        currentWidgets={filteredWidgets}
        availableWidgets={allAvailableWidgets}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={8} paddingBottom={10}>
          <GuidedTourHomepageOverview />
          {loading ? (
            <Box position="absolute" top={0} left={0} right={0} bottom={0}>
              <Page.Loading />
            </Box>
          ) : (
            <Grid.Root gap={5} ref={drop}>
              {widgetLayout.map(({ widget, index, shouldShowDropZone, dropZoneWidth }) => (
                <React.Fragment key={widget.uid}>
                  <Grid.Item col={columnWidths[widget.uid] || 6} s={12}>
                    <WidgetRoot
                      uid={widget.uid}
                      title={widget.title}
                      icon={widget.icon}
                      link={widget.link}
                      findWidget={findWidget}
                      moveWidget={moveWidget}
                      columnWidths={columnWidths}
                      setColumnWidths={setColumnWidths}
                      deleteWidget={deleteWidget}
                    >
                      <WidgetComponent
                        component={widget.component}
                        columnWidth={columnWidths[widget.uid] || 6}
                      />
                    </WidgetRoot>
                  </Grid.Item>
                  {shouldShowDropZone && (
                    <Grid.Item
                      col={dropZoneWidth}
                      display={{ initial: 'none', large: 'block' }}
                      key={`${widget.uid}-empty-box`}
                    >
                      <GapDropZone
                        insertIndex={index + 1}
                        moveWidget={moveWidget}
                        onDropWidget={handleDropWidget}
                      />
                    </Grid.Item>
                  )}
                </React.Fragment>
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
