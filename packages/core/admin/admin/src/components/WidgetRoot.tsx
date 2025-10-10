import * as React from 'react';

import { Box, Flex, Typography, ScrollArea, IconButton } from '@strapi/design-system';
import { PuzzlePiece, Trash, Drag } from '@strapi/icons';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';
import styled from 'styled-components';

import { useTracking } from '../features/Tracking';
import { WIDGET_DATA_ATTRIBUTES } from '../utils/widgetLayout';

import type { FindWidgetFunction, WidgetIdFunction, DragEndFunction } from '../features/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';

export interface BaseWidgetProps
  extends Pick<WidgetType, 'title' | 'icon' | 'permissions' | 'link' | 'uid'> {
  findWidget?: FindWidgetFunction;
  deleteWidget?: WidgetIdFunction;
  onDragStart?: WidgetIdFunction;
  onDragEnd?: DragEndFunction;
}

export interface WidgetRootProps extends BaseWidgetProps {
  children: React.ReactNode;
  component?: () => Promise<React.ComponentType>;
}

const WidgetActions = styled(Flex)`
  display: flex;

  @media (hover: hover) and (pointer: fine) {
    display: none;
  }
`;

const DragIconButton = styled(IconButton)`
  display: none;

  @media (hover: hover) and (pointer: fine) {
    display: flex;
  }
`;

const WidgetContainer = styled(Flex)`
  @media (hover: hover) and (pointer: fine) {
    &:hover ${WidgetActions} {
      display: flex;
    }
  }

  &:focus-within ${WidgetActions} {
    display: flex;
  }

  &:focus-within ${DragIconButton} {
    pointer-events: none;

    ${({ theme }) => theme.breakpoints.medium} {
      pointer-events: auto;
    }
  }
`;

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

  const handleClickOnLink = () => {
    trackUsage('didOpenHomeWidgetLink', { widgetUID: uid });
  };

  const handleDeleteWidget = () => {
    deleteWidget?.(uid);
  };

  const [, drag, preview] = useDrag(
    () => ({
      type: 'widget',
      item: () => {
        onDragStart?.(uid);
        return {
          id: uid,
          originalIndex: findWidget?.(uid)?.index ?? 0,
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
    <WidgetContainer
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
      tabIndex={0}
      {...{ [WIDGET_DATA_ATTRIBUTES.WIDGET_ID]: uid }}
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Flex
        direction="row"
        gap={2}
        width="100%"
        tag="header"
        alignItems="center"
        minHeight="2.25rem"
      >
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
        <WidgetActions gap={2}>
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
          <DragIconButton
            variant="tertiary"
            size="XS"
            ref={drag}
            tabIndex={-1}
            label={formatMessage({
              id: 'HomePage.widget.drag',
              defaultMessage: 'Drag to move',
            })}
            cursor="grab"
          >
            <Drag />
          </DragIconButton>
        </WidgetActions>
      </Flex>
      <ScrollArea>
        <Box width="100%" height="261px" overflow="auto" tag="main">
          {children}
        </Box>
      </ScrollArea>
    </WidgetContainer>
  );
};
