/**
 *
 * PopUpWarning
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { Button, Padded, Text } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import Body from './Body';
import ContentText from './Content';
import Header from './Header';
import Icon from './Icon';
import StyledModal from './StyledModal';
import StyledFooter from './StyledFooter';

function PopUpWarning({
  content,
  isOpen,
  isConfirmButtonLoading,
  onConfirm,
  onlyConfirmButton,
  popUpWarningType,
  toggleModal,
  ...rest
}) {
  const handleToggle = e => {
    // Prevent user interactions while requests are being submitted
    if (isConfirmButtonLoading) {
      return;
    }

    toggleModal(e);
  };

  const buttons = [
    {
      color: 'cancel',
      onClick: handleToggle,
      message: content.cancel || 'components.popUpWarning.button.cancel',
    },
    {
      color: 'delete',
      onClick: onConfirm,
      isLoading: isConfirmButtonLoading,
      message: content.confirm || 'components.popUpWarning.button.confirm',
    },
  ];

  const singleButton = [
    {
      color: 'delete',
      onClick: onConfirm,
      message: content.confirm || 'components.popUpWarning.button.confirm',
      style: { width: '100%' },
    },
  ];
  const footerButtons = onlyConfirmButton ? singleButton : buttons;

  return (
    <StyledModal isOpen={isOpen} toggle={handleToggle} {...rest}>
      <Header onClick={handleToggle} title={content.title} />
      <Body>
        <Icon type={popUpWarningType} />
        <ContentText small={content.secondMessage}>
          <FormattedMessage
            id={content.message || 'components.popUpWarning.message'}
            values={content.messageValues}
          />
        </ContentText>
        {content.secondMessage && (
          <Padded top size="smd">
            <Text color="lightOrange">
              <FormattedMessage id={content.secondMessage} />
            </Text>
          </Padded>
        )}
      </Body>
      <StyledFooter>
        {map(footerButtons, button => {
          const { message, onClick, ...rest } = button;
          return (
            <Button key={message} onClick={onClick} {...rest}>
              <FormattedMessage id={message} />
            </Button>
          );
        })}
      </StyledFooter>
    </StyledModal>
  );
}

PopUpWarning.propTypes = {
  content: PropTypes.shape({
    cancel: PropTypes.string,
    confirm: PropTypes.string,
    message: PropTypes.string,
    secondMessage: PropTypes.string,
    title: PropTypes.string,
  }),
  isConfirmButtonLoading: PropTypes.bool,
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onlyConfirmButton: PropTypes.bool,
  popUpWarningType: PropTypes.string,
  toggleModal: PropTypes.func.isRequired,
};

PopUpWarning.defaultProps = {
  content: {
    cancel: 'components.popUpWarning.button.cancel',
    confirm: 'components.popUpWarning.button.confirm',
    message: 'components.popUpWarning.message',
    messageValues: {},
    secondMessage: null,
    title: 'components.popUpWarning.title',
  },
  isConfirmButtonLoading: false,
  onlyConfirmButton: false,
  popUpWarningType: 'danger',
};

export default PopUpWarning;
