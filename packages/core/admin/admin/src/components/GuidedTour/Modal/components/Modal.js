import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { pxToRem } from '@strapi/helper-plugin';
import { Portal, FocusTrap, Flex, Box, IconButton, Button } from '@strapi/design-system';
import { Cross } from '@strapi/icons';

const ModalWrapper = styled(Flex)`
  position: fixed;
  z-index: 4;
  inset: 0;
  /* this is theme.colors.neutral800 with opacity */
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
`;

const Modal = ({ onClose, onSkip, children, hideSkip }) => {
  const { formatMessage } = useIntl();

  return (
    <Portal>
      <ModalWrapper onClick={onClose} padding={8} justifyContent="center">
        <FocusTrap onEscape={onClose}>
          <Flex
            direction="column"
            alignItems="stretch"
            background="neutral0"
            width={pxToRem(660)}
            shadow="popupShadow"
            hasRadius
            padding={4}
            gap={8}
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justifyContent="flex-end">
              <IconButton
                onClick={onClose}
                aria-label={formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' })}
                icon={<Cross />}
              />
            </Flex>
            <Box paddingLeft={7} paddingRight={7} paddingBottom={hideSkip ? 8 : 0}>
              {children}
            </Box>
            {!hideSkip && (
              <Flex justifyContent="flex-end">
                <Button variant="tertiary" onClick={onSkip}>
                  {formatMessage({
                    id: 'app.components.GuidedTour.skip',
                    defaultMessage: 'Skip the tour',
                  })}
                </Button>
              </Flex>
            )}
          </Flex>
        </FocusTrap>
      </ModalWrapper>
    </Portal>
  );
};

Modal.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  hideSkip: PropTypes.bool.isRequired,
};

export default Modal;
