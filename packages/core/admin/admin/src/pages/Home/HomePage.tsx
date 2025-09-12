import * as React from 'react';

import { Box, Flex, Grid, Main, Typography, ScrollArea } from '@strapi/design-system';
import { Drag, PuzzlePiece } from '@strapi/icons';
import { useDrag, useDrop } from 'react-dnd';
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
import { useWidgets } from '../../features/Widgets';

import { FreeTrialEndedModal } from './components/FreeTrialEndedModal';
import { FreeTrialWelcomeModal } from './components/FreeTrialWelcomeModal';

import type { WidgetWithUID } from '../../core/apis/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';
import { useWidgetResize } from '../../hooks/useWidgetResize';
import { GapDropZone } from '../../components/Widgets';

/* -------------------------------------------------------------------------------------------------
 * WidgetRoot
 * -----------------------------------------------------------------------------------------------*/

interface WidgetRootProps
  extends Pick<WidgetType, 'title' | 'icon' | 'permissions' | 'link' | 'uid'> {
  children: React.ReactNode;
  columnWidths: Record<string, number>;
  setColumnWidths: (
    widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  findWidget: (id: string) => { index: number };
  moveWidget: (id: string, to: number) => void;
}

interface Item {
  id: string;
  originalIndex: number;
}

export const WidgetRoot = ({
  title,
  icon = PuzzlePiece,
  children,
  link,
  uid,
  columnWidths,
  setColumnWidths,
  findWidget,
  moveWidget,
}: WidgetRootProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const Icon = icon;
  const columnWidth = columnWidths[uid] || 6;
  const originalIndex = findWidget(uid).index;
  const [isDraggingFromHandle, setIsDraggingFromHandle] = React.useState(false);

  // Smooth move widget using requestAnimationFrame
  const smoothMoveWidget = React.useCallback(
    (id: string, atIndex: number) => {
      requestAnimationFrame(() => {
        moveWidget(id, atIndex);
      });
    },
    [moveWidget]
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'widget',
      item: () => {
        return { id: uid, originalIndex };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: (item, monitor) => {
        const { id: droppedId, originalIndex } = item;
        const didDrop = monitor.didDrop();
        if (!didDrop) {
          moveWidget(droppedId, originalIndex);
        }
        setIsDraggingFromHandle(false);
      },
      canDrag: () => isDraggingFromHandle,
    }),
    [uid, originalIndex, moveWidget, isDraggingFromHandle]
  );

  const [{ isOver }, drop] = useDrop<Item, void, { isOver: boolean }>(
    () => ({
      accept: 'widget',
      hover({ id: draggedId }: Item) {
        if (draggedId !== uid) {
          const { index: overIndex } = findWidget(uid);
          const { index: draggedIndex } = findWidget(draggedId);

          // Only move if the dragged item is actually changing position
          if (draggedIndex !== overIndex) {
            smoothMoveWidget(draggedId, overIndex);
          }
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [findWidget, smoothMoveWidget, uid]
  );

  const opacity = isDragging ? 0 : 1;

  const handleClickOnLink = () => {
    trackUsage('didOpenHomeWidgetLink', { widgetUID: uid });
  };

  const { handleMouseDown } = useWidgetResize({
    columnWidth,
    onWidthChange: (newWidth) =>
      setColumnWidths((prev) => ({
        ...prev,
        [uid]: newWidth,
      })),
  });

  return (
    <Flex
      width="100%"
      hasRadius
      direction="column"
      alignItems="flex-start"
      background={isOver ? 'primary100' : 'neutral0'}
      borderColor={isOver ? 'primary500' : 'neutral150'}
      shadow="tableShadow"
      tag="section"
      gap={4}
      padding={6}
      position="relative"
      aria-labelledby={uid}
      ref={(node: HTMLElement | null) => {
        if (node) {
          drag(drop(node));
        }
      }}
      style={{
        opacity,
        zIndex: isDragging ? 1000 : 1,
        transition: isDragging ? 'none' : 'all 0.2s ease-in-out',
      }}
    >
      <Flex direction="row" gap={2} width="100%" tag="header" alignItems="center">
        <Flex gap={2} marginRight="auto">
          <Icon fill="neutral500" aria-hidden />
          <Typography textColor="neutral500" variant="sigma" tag="h2" id={uid}>
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
        <Box cursor="grab" onMouseDown={() => setIsDraggingFromHandle(true)}>
          <Drag display="block" />
        </Box>
      </Flex>
      <ScrollArea>
        <Box width="100%" height="261px" overflow="auto" tag="main">
          {children}
        </Box>
      </ScrollArea>
      <Flex
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        padding={2}
        alignItems="center"
        style={{ cursor: 'col-resize' }}
        onMouseDown={handleMouseDown}
      >
        <Box background="neutral150" height="24px" width="2px" borderRadius={1} />
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UnstableHomePageCe
 * -----------------------------------------------------------------------------------------------*/

const WidgetComponent = ({
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

  // Use custom hook for widget management
  const {
    findWidget,
    moveWidget,
    handleDropWidget,
    widgetLayout,
    columnWidths,
    setColumnWidths,
    WidgetRoot,
  } = useWidgets({
    filteredWidgets,
    setFilteredWidgets,
  });

  const [, drop] = useDrop(() => ({ accept: 'widget' }));

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
          primaryAction={null}
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
