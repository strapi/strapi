import * as React from 'react';

import { Box, Flex, Typography, ScrollArea, IconButton } from '@strapi/design-system';
import { PuzzlePiece, Trash, Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';

import { useWidgetManagement } from '../hooks/useWidgetManagement';
import { useGapDropZonePosition } from '../hooks/useGapDropZonePosition';
import { InterWidgetResizeHandle } from '../components/ResizeIndicator';

import { useTracking } from './Tracking';

import type { WidgetWithUID } from '../core/apis/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

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
  moveWidget: (
    id: string,
    atIndex: number,
    targetRowIndex?: number,
    isHorizontalDrop?: boolean
  ) => void;
  deleteWidget: (id: string) => void;
  onDragStart?: (widgetId: string) => void;
  onDragEnd?: () => void;
  component?: () => Promise<React.ComponentType>;
}

export const WidgetRoot = ({
  title,
  icon = PuzzlePiece,
  children,
  link,
  uid,
  findWidget,
  deleteWidget,
  onDragStart,
  onDragEnd,
  component,
}: WidgetRootProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const Icon = icon;
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClickOnLink = () => {
    trackUsage('didOpenHomeWidgetLink', { widgetUID: uid });
  };

  const handleDeleteWidget = () => {
    deleteWidget(uid);
  };

  const handleDragStart = () => {
    onDragStart?.(uid);
  };

  const [, drag, preview] = useDrag(
    () => ({
      type: 'widget',
      item: () => {
        onDragStart?.(uid);
        return {
          id: uid,
          originalIndex: findWidget(uid).index,
          title,
          icon,
          link,
          component,
        };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: () => {
        onDragEnd?.();
      },
    }),
    [uid, findWidget, onDragStart, onDragEnd, title, icon, link, component]
  );

  // Suppress default drag preview
  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <Flex
      width="100%"
      hasRadius
      direction="column"
      alignItems="flex-start"
      background={'neutral0'}
      borderColor={'neutral150'}
      shadow="tableShadow"
      tag="section"
      gap={4}
      padding={6}
      position="relative"
      aria-labelledby={uid}
      ref={(node: HTMLElement | null) => {
        if (node) {
          node.setAttribute('data-widget-id', uid);
        }
        drag(node);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Flex direction="row" gap={2} width="100%" tag="header" alignItems="center" minHeight="22px">
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
        {isHovered && (
          <Flex gap={2}>
            <IconButton
              variant="danger-light"
              size="XS"
              onClick={handleDeleteWidget}
              label={formatMessage({
                id: 'HomePage.widget.delete',
                defaultMessage: 'Delete',
              })}
              cursor="pointer"
            >
              <Trash />
            </IconButton>
            <IconButton
              variant="tertiary"
              size="XS"
              onMouseDown={handleDragStart}
              label={formatMessage({
                id: 'HomePage.widget.drag',
                defaultMessage: 'Drag to move',
              })}
              cursor="grab"
            >
              <Drag />
            </IconButton>
          </Flex>
        )}
      </Flex>
      <ScrollArea>
        <Box width="100%" height="261px" overflow="auto" tag="main">
          {children}
        </Box>
      </ScrollArea>
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
  const [isDraggingWidget, setIsDraggingWidget] = React.useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = React.useState<string | undefined>();

  // Use custom hook for widget management
  const { findWidget, deleteWidget, addWidget, moveWidget, handleInterWidgetResize } =
    useWidgetManagement({
      filteredWidgets,
      setFilteredWidgets,
      columnWidths,
      setColumnWidths,
    });

  // Drag state callbacks
  const handleDragStart = React.useCallback((widgetId: string) => {
    setIsDraggingWidget(true);
    setDraggedWidgetId(widgetId);
  }, []);

  const handleDragEnd = React.useCallback(() => {
    setIsDraggingWidget(false);
    setDraggedWidgetId(undefined);
  }, []);

  // Use GapDropZone positioning hook
  const { gapDropZonePositions } = useGapDropZonePosition({
    filteredWidgets,
    columnWidths,
    isDraggingWidget,
    draggedWidgetId,
  });

  return {
    findWidget,
    deleteWidget,
    addWidget,
    moveWidget,
    columnWidths,
    setColumnWidths,
    WidgetRoot,
    handleInterWidgetResize,
    gapDropZonePositions,
    isDraggingWidget,
    handleDragStart,
    handleDragEnd,
  };
};
