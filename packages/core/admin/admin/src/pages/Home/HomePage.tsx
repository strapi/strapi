import * as React from 'react';

import { Box, Button, Flex, Grid, Main } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { DragLayer, isWidgetDragItem } from '../../components/DragLayer';
import { GapDropZoneManager } from '../../components/GapDropZone';
import { GuidedTourHomepageOverview } from '../../components/GuidedTour/Overview';
import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { WidgetResizeHandle } from '../../components/ResizeIndicator';
import { Widget } from '../../components/WidgetHelpers';
import { WidgetRoot } from '../../components/WidgetRoot';
import { useEnterprise } from '../../ee';
import { useAuth } from '../../features/Auth';
import { useStrapiApp } from '../../features/StrapiApp';
import { useWidgets } from '../../features/Widgets';
import { useGetHomepageLayoutQuery } from '../../services/homepage';
import {
  getWidgetElement,
  WIDGET_DATA_ATTRIBUTES,
  applyHomepageLayout,
  createDefaultWidgetWidths,
  isLastWidgetInRow,
  canResizeBetweenWidgets,
  getWidgetWidth,
} from '../../utils/widgetLayout';

import { AddWidgetModal } from './components/AddWidgetModal';
import { FreeTrialEndedModal } from './components/FreeTrialEndedModal';
import { FreeTrialWelcomeModal } from './components/FreeTrialWelcomeModal';

import type { WidgetWithUID } from '../../core/apis/Widgets';

// Styled wrapper for the drag preview
const DragPreviewWrapper = styled.div<{ $maxWidth: string }>`
  max-width: ${(props) => props.$maxWidth};
  overflow: hidden;
  opacity: 0.9;
  border: 2px solid ${({ theme }) => theme.colors.primary500};
  border-radius: ${({ theme }) => theme.borderRadius};
  pointer-events: none;
`;

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
  const [loadedComponent, setLoadedComponent] = React.useState<React.ComponentType<{
    columnWidth?: number;
  }> | null>(null);

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

  return <Component {...({ columnWidth } as Record<string, unknown>)} />;
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
  const { data: homepageLayout, isLoading: _isLoadingLayout } = useGetHomepageLayoutQuery();
  const [filteredWidgets, setFilteredWidgets] = React.useState<WidgetWithUID[]>([]);
  const [allAvailableWidgets, setAllAvailableWidgets] = React.useState<WidgetWithUID[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = React.useState(false);

  // Use custom hook for widget management
  const {
    findWidget,
    deleteWidget,
    addWidget,
    moveWidget,
    columnWidths,
    setColumnWidths,
    handleWidgetResize,
    saveLayout,
    isDraggingWidget,
    draggedWidgetId,
    handleDragStart,
    handleDragEnd,
  } = useWidgets({
    filteredWidgets,
    setFilteredWidgets,
  });

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

      setAllAvailableWidgets(authorizedWidgetsList);
      setLoading(false);
    };

    checkWidgetsPermissions();
  }, [checkUserHasPermissions, getAllWidgets]);

  React.useEffect(() => {
    if (allAvailableWidgets.length === 0) return;

    // If user has customized the homepage layout, apply it
    if (homepageLayout && homepageLayout.widgets) {
      const { filteredWidgets, widths: homepageWidths } = applyHomepageLayout(
        allAvailableWidgets,
        homepageLayout
      );

      setFilteredWidgets(filteredWidgets);
      setColumnWidths(homepageWidths);
    } else {
      // Set default layout when no custom layout exists
      setFilteredWidgets(allAvailableWidgets);
      setColumnWidths(createDefaultWidgetWidths(allAvailableWidgets));
    }
  }, [homepageLayout, allAvailableWidgets, setColumnWidths]);

  const widgetLayout = React.useMemo(() => {
    return filteredWidgets.map((widget, index) => {
      const rightWidgetId = filteredWidgets[index + 1]?.uid;
      const widgetWidth = getWidgetWidth(columnWidths, widget.uid);
      const rightWidgetWidth = getWidgetWidth(columnWidths, rightWidgetId);

      return {
        widget,
        index,
        isLastInRow: isLastWidgetInRow(index, filteredWidgets, columnWidths),
        rightWidgetId,
        widgetWidth,
        rightWidgetWidth,
        canResize:
          rightWidgetId &&
          canResizeBetweenWidgets(widget.uid, rightWidgetId, columnWidths, filteredWidgets),
      };
    });
  }, [filteredWidgets, columnWidths]);

  return (
    <Layouts.Root>
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
              fullWidth
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
          onAddWidget={addWidget}
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
              <Box position="relative" {...{ [WIDGET_DATA_ATTRIBUTES.GRID_CONTAINER]: true }}>
                <Grid.Root gap={5}>
                  {widgetLayout.map(
                    ({
                      widget,
                      isLastInRow,
                      rightWidgetId,
                      widgetWidth,
                      rightWidgetWidth,
                      canResize,
                    }) => (
                      <React.Fragment key={widget.uid}>
                        <Grid.Item col={widgetWidth} xs={12}>
                          <WidgetRoot
                            uid={widget.uid}
                            title={widget.title}
                            icon={widget.icon}
                            link={widget.link}
                            findWidget={findWidget}
                            deleteWidget={deleteWidget}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            component={widget.component}
                          >
                            <WidgetComponent
                              component={widget.component}
                              columnWidth={widgetWidth}
                            />
                          </WidgetRoot>
                        </Grid.Item>

                        {!isLastInRow && canResize && rightWidgetId && (
                          <WidgetResizeHandle
                            key={`resize-${widget.uid}`}
                            leftWidgetId={widget.uid}
                            rightWidgetId={rightWidgetId}
                            leftWidgetWidth={widgetWidth}
                            rightWidgetWidth={rightWidgetWidth}
                            onResize={handleWidgetResize}
                            saveLayout={saveLayout}
                            filteredWidgets={filteredWidgets}
                          />
                        )}
                      </React.Fragment>
                    )
                  )}
                </Grid.Root>

                {isDraggingWidget && (
                  <GapDropZoneManager
                    filteredWidgets={filteredWidgets}
                    columnWidths={columnWidths}
                    draggedWidgetId={draggedWidgetId}
                    moveWidget={moveWidget}
                  />
                )}
              </Box>
            )}
          </Flex>
        </Layouts.Content>

        {/* Add the DragLayer to handle custom drag previews */}
        <DragLayer
          renderItem={({ type, item }) => {
            if (!isWidgetDragItem(item)) {
              return null;
            }

            const widgetElement = getWidgetElement(item.id);
            const maxWidth = `${widgetElement?.clientWidth}px`;

            return (
              <DragPreviewWrapper $maxWidth={maxWidth}>
                <WidgetRoot
                  uid={item.id as WidgetWithUID['uid']}
                  title={item.title || { id: `${item.id}`, defaultMessage: item.id }}
                  icon={item.icon}
                  link={item.link}
                >
                  <WidgetComponent component={item.component} columnWidth={4} />
                </WidgetRoot>
              </DragPreviewWrapper>
            );
          }}
        />
      </Main>
    </Layouts.Root>
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
