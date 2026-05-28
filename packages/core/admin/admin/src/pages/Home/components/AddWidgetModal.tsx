import * as React from 'react';

import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { PuzzlePiece } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { WidgetComponent } from '../HomePage';

import type { WidgetWithUID } from '../../../core/apis/Widgets';

// Hide scrollbars in widget previews
const WidgetWrapper = styled(Box)`
  * {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  *::-webkit-scrollbar {
    display: none;
  }
`;

// Interactive widget preview container
const WidgetPreviewContainer = styled(Box)`
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};
  }

  &:focus-visible {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};
    outline-offset: 0;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * AddWidgetModal
 * -----------------------------------------------------------------------------------------------*/

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: WidgetWithUID) => void;
  currentWidgets: WidgetWithUID[];
  availableWidgets: WidgetWithUID[];
}

interface WidgetPreviewProps {
  widget: WidgetWithUID;
  onSelect: () => void;
}

const WidgetPreview = ({ widget, onSelect }: WidgetPreviewProps) => {
  const { formatMessage } = useIntl();
  const Icon = widget.icon || PuzzlePiece;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <WidgetPreviewContainer
      padding={4}
      background="neutral0"
      borderColor="neutral200"
      hasRadius
      shadow="tableShadow"
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      width={'100%'}
      cursor="pointer"
      tabIndex={0}
      role="button"
      aria-label={formatMessage(
        {
          id: 'HomePage.addWidget.selectWidget',
          defaultMessage: 'Select {widgetName} widget',
        },
        { widgetName: formatMessage(widget.title) }
      )}
    >
      <Flex direction="column" alignItems="center" gap={3}>
        <Flex gap={2} marginRight="auto">
          <Icon fill="neutral500" aria-hidden />
          <Typography textColor="neutral500" variant="sigma" tag="h2">
            {formatMessage(widget.title)}
          </Typography>
        </Flex>
        <WidgetWrapper
          width={'100%'}
          style={{
            pointerEvents: 'none',
          }}
        >
          <WidgetComponent component={widget.component} columnWidth={4} />
        </WidgetWrapper>
      </Flex>
    </WidgetPreviewContainer>
  );
};

export const AddWidgetModal = ({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  availableWidgets,
}: AddWidgetModalProps) => {
  const { formatMessage } = useIntl();

  const currentWidgetUids = React.useMemo(
    () => new Set(currentWidgets.map((widget) => widget.uid)),
    [currentWidgets]
  );

  const handleWidgetSelect = (widget: WidgetWithUID) => {
    if (!currentWidgetUids.has(widget.uid)) {
      onAddWidget(widget);
      onClose();
    }
  };

  const addableWidgets = availableWidgets.filter((widget) => !currentWidgetUids.has(widget.uid));

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: 'HomePage.addWidget.title',
              defaultMessage: 'Add Widget',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Box>
            {addableWidgets.length === 0 ? (
              <Flex direction="column" alignItems="center" gap={4}>
                <PuzzlePiece width="4rem" height="4rem" fill="neutral300" />
                <Typography textColor="neutral500" textAlign="center">
                  {formatMessage({
                    id: 'HomePage.addWidget.noWidgetsAvailable',
                    defaultMessage: 'No widgets available to add',
                  })}
                </Typography>
              </Flex>
            ) : (
              <Flex direction="column" gap={3} justifyContent="center">
                {addableWidgets.map((widget) => (
                  <WidgetPreview
                    key={widget.uid}
                    widget={widget}
                    onSelect={() => handleWidgetSelect(widget)}
                  />
                ))}
              </Flex>
            )}
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
