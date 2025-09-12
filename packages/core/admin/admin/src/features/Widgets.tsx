import * as React from 'react';

import { Box, Flex, Typography, ScrollArea, Menu, IconButton } from '@strapi/design-system';
import { Drag, PuzzlePiece, More, Trash } from '@strapi/icons';
import { useDrag, useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';

import { useWidgetLayout } from '../hooks/useWidgetLayout';
import { useWidgetManagement } from '../hooks/useWidgetManagement';
import { useDragResize } from '../hooks/useWidgetResize';
import { createResizeMenuItems, handleResizeSelect } from '../utils/widgetResizeUtils';

import { useTracking } from './Tracking';

import type { WidgetWithUID } from '../core/apis/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * WidgetRoot Component
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
  deleteWidget: (id: string) => void;
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
  deleteWidget,
}: WidgetRootProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const Icon = icon;
  const columnWidth = columnWidths[uid] || 6;
  const originalIndex = findWidget(uid).index;
  const [isDraggingFromHandle, setIsDraggingFromHandle] = React.useState(false);
  const [dragStarted, setDragStarted] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Smooth move widget using requestAnimationFrame
  const smoothMoveWidget = React.useCallback(
    (id: string, atIndex: number) => {
      requestAnimationFrame(() => moveWidget(id, atIndex));
    },
    [moveWidget]
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'widget',
      item: () => {
        setDragStarted(true);
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
        setDragStarted(false);
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

  const handleDragIconMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    setIsDraggingFromHandle(true);
  };

  const handleDragIconClick = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // If mouse didn't move much and no drag started, it's a click
    if (!dragStarted) {
      setIsMenuOpen(true);
    } else {
      // It was a drag, prevent the menu from opening
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Resize Logic
  const { handleMouseDown, resizeTo } = useDragResize({
    columnWidth,
    onWidthChange: (newWidth) =>
      setColumnWidths((prev) => ({
        ...prev,
        [uid]: newWidth,
      })),
  });

  const handleResizeSelectWrapper = (value: string | number) => {
    handleResizeSelect(value, resizeTo, () => setIsMenuOpen(false));
  };

  const handleDeleteWidget = () => {
    deleteWidget(uid);
  };

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
        <IconButton
          variant="tertiary"
          size="S"
          onMouseDown={handleDragIconMouseDown}
          onClick={handleDragIconClick}
          label={formatMessage({
            id: 'HomePage.widget.drag-menu',
            defaultMessage: 'Click to open menu, drag to move',
          })}
          style={{ cursor: 'grab' }}
          withTooltip={true}
        >
          <Drag />
        </IconButton>
        <Menu.Root
          key="more-menu"
          defaultOpen={false}
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
        >
          <Menu.Trigger
            variant="tertiary"
            size="S"
            label={formatMessage({ id: 'global.more', defaultMessage: 'More' })}
            startIcon={<More />}
            endIcon={null}
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              top: '25px',
              right: '0',
            }}
          />
          <Menu.Content onCloseAutoFocus={(e) => e.preventDefault()} maxHeight="100%" zIndex={2}>
            <Menu.SubRoot>
              <Menu.SubTrigger>
                {formatMessage({
                  id: 'content-releases.header.actions.resize',
                  defaultMessage: 'Resize',
                })}
              </Menu.SubTrigger>
              <Menu.SubContent>
                {createResizeMenuItems(columnWidth, formatMessage, handleResizeSelectWrapper).map(
                  (item) => (
                    <Menu.Item
                      key={item.key}
                      onClick={item.onClick}
                      startIcon={<item.startIcon />}
                      disabled={item.isCurrentWidth}
                    >
                      {item.label}
                    </Menu.Item>
                  )
                )}
              </Menu.SubContent>
            </Menu.SubRoot>
            <Menu.Item onClick={handleDeleteWidget} variant="danger" startIcon={<Trash />}>
              {formatMessage({
                id: 'content-releases.header.actions.delete',
                defaultMessage: 'Delete',
              })}
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
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
 * Widget Management Hook
 * -----------------------------------------------------------------------------------------------*/

interface UseWidgetsOptions {
  filteredWidgets: WidgetWithUID[];
  setFilteredWidgets: (
    widgets: WidgetWithUID[] | ((prev: WidgetWithUID[]) => WidgetWithUID[])
  ) => void;
}

/**
 * Main hook for widget management functionality
 * Consolidates widget layout and management logic
 */
export const useWidgets = ({ filteredWidgets, setFilteredWidgets }: UseWidgetsOptions) => {
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});

  // Use custom hook for widget management
  const { findWidget, moveWidget, handleDropWidget, deleteWidget } = useWidgetManagement({
    filteredWidgets,
    setFilteredWidgets,
  });

  // Use custom hook for widget layout calculation
  const { widgetLayout } = useWidgetLayout({
    filteredWidgets,
    columnWidths,
  });

  return {
    findWidget,
    moveWidget,
    handleDropWidget,
    deleteWidget,
    widgetLayout,
    columnWidths,
    setColumnWidths,
    WidgetRoot,
  };
};

export type { WidgetRootProps };
