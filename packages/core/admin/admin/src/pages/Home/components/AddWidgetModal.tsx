import * as React from 'react';

import { Box, Button, Flex, Grid, Modal, Typography, ScrollArea } from '@strapi/design-system';
import { PuzzlePiece } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { WidgetWithUID } from '../../../core/apis/Widgets';
import { WidgetComponent } from '../HomePage';

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
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Box
      padding={4}
      background={isHovered ? 'primary100' : 'neutral0'}
      borderColor={isHovered ? 'primary200' : 'neutral200'}
      hasRadius
      shadow="tableShadow"
      onClick={onSelect}
      width={'100%'}
      cursor="pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Flex direction="column" alignItems="center" gap={3}>
        <Flex gap={2} marginRight="auto">
          <Icon fill="neutral500" aria-hidden />
          <Typography textColor="neutral500" variant="sigma" tag="h2">
            {formatMessage(widget.title)}
          </Typography>
        </Flex>
        <Box
          width={'100%'}
          style={{
            pointerEvents: 'none',
          }}
        >
          <WidgetComponent component={widget.component} columnWidth={4} />
        </Box>
      </Flex>
    </Box>
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
          <ScrollArea>
            <Box padding={6}>
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
          </ScrollArea>
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
