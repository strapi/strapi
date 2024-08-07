import * as React from 'react';

import { Page, Layouts } from '@strapi/admin/strapi-admin';
import { Box } from '@strapi/design-system';
import { XYCoord, useDragLayer } from 'react-dnd';
import { useIntl } from 'react-intl';

import { DRAG_DROP_TYPES } from '../constants';

import { StageDragPreview } from './StageDragPreview';

function getStyle(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  mouseOffset: XYCoord | null
) {
  if (!initialOffset || !currentOffset || !mouseOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;

  return {
    transform: `translate(${x}px, ${y}px)`,
  };
}

const DragLayerRendered = () => {
  const { itemType, isDragging, item, initialOffset, currentOffset, mouseOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
      mouseOffset: monitor.getClientOffset(),
    })
  );

  if (!isDragging || itemType !== DRAG_DROP_TYPES.STAGE) {
    return null;
  }

  return (
    <Box
      height="100%"
      left={0}
      position="fixed"
      pointerEvents="none"
      top={0}
      zIndex={100}
      width="100%"
    >
      <Box style={getStyle(initialOffset, currentOffset, mouseOffset)}>
        <StageDragPreview name={typeof item.item === 'string' ? item.item : null} />;
      </Box>
    </Box>
  );
};

const Root: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Page.Main>
      <Layouts.Content>{children}</Layouts.Content>
    </Page.Main>
  );
};

interface HeaderProps {
  title: string;
  navigationAction?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  subtitle?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, navigationAction, primaryAction }) => {
  const { formatMessage } = useIntl();
  return (
    <>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: title,
          }
        )}
      </Page.Title>
      <Layouts.BaseHeader
        navigationAction={navigationAction}
        primaryAction={primaryAction}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
};

export { DragLayerRendered, Header, Root };
