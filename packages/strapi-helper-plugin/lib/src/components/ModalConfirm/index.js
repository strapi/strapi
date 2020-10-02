import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Padded, Text } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import Src from '../../assets/icons/icon_danger.svg';
import Header from './Header';
import { Body, Footer, Img, StyledModal, TextWrapper } from './styled';

const ModalConfirm = ({
  buttons,
  cancelButtonLabel,
  confirmButtonLabel,
  content,
  children,
  isOpen,
  onConfirm,
  showButtonLoader,
  title,
  toggle,
  type,
  ...rest
}) => {
  const handleToggle = useCallback(
    e => {
      // Prevent action when loading
      if (showButtonLoader) {
        return;
      }

      toggle(e);
    },
    [showButtonLoader, toggle]
  );

  let displayedButtons = buttons;

  // If type is info the buttons array allows more control on a specific button behaviour: label, onClick...
  if (type !== 'info' && !buttons) {
    const confirmButtonColor = ['xwarning', 'warning'].includes(type) ? 'delete' : 'success';

    displayedButtons = [
      <Button color="cancel" type="button" key="cancel" onClick={handleToggle}>
        <FormattedMessage {...cancelButtonLabel} />
      </Button>,
      <Button
        color={confirmButtonColor}
        type="button"
        key="confirm"
        onClick={onConfirm}
        isLoading={showButtonLoader}
      >
        <FormattedMessage {...confirmButtonLabel} />
      </Button>,
    ];
  }

  return (
    <StyledModal isOpen={isOpen} toggle={handleToggle} {...rest}>
      <Header title={title} toggle={handleToggle} />
      <Body>
        <Img src={Src} alt="icon" />;
        <TextWrapper>
          <Text lineHeight="18px">
            <FormattedMessage {...content} />
          </Text>
        </TextWrapper>
        {children && (
          <Padded top size="smd">
            {children}
          </Padded>
        )}
      </Body>
      <Footer>{displayedButtons}</Footer>
    </StyledModal>
  );
};

ModalConfirm.defaultProps = {
  buttons: null,
  children: null,
  content: {
    id: 'components.popUpWarning.message',
    defaultMessage: 'Are you sure?',
    values: {
      // Example
      //   b: chunks => <b>{chunks}</b>,
      // br: () => <br />,
    },
  },
  cancelButtonLabel: {
    id: 'components.popUpWarning.button.cancel',
    defaultMessage: 'No, cancel',
    values: {},
  },
  confirmButtonLabel: {
    id: 'components.popUpWarning.button.confirm',
    defaultMessage: 'Yes,  confirm',
    values: {},
  },
  onConfirm: () => {},
  showButtonLoader: false,

  toggle: () => {},
  title: {
    id: 'components.popUpWarning.title',
    defaultMessage: 'Please confirm',
    values: {},
  },
  type: 'warning',
};

ModalConfirm.propTypes = {
  buttons: PropTypes.array,
  children: PropTypes.element,
  cancelButtonLabel: PropTypes.exact({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  confirmButtonLabel: PropTypes.exact({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  content: PropTypes.exact({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func,
  showButtonLoader: PropTypes.bool,
  title: PropTypes.exact({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  toggle: PropTypes.func,
  type: PropTypes.oneOf(['warning', 'xwarning', 'info']),
};

export default ModalConfirm;
