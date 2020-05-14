/**
 *
 * PopUpWarning
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';

import IcoDanger from '../../assets/icons/icon_danger.svg';
import IcoNotFound from '../../assets/icons/icon_flag_not_found.svg';
import IcoInfo from '../../assets/icons/icon_info.svg';
import IcoSuccess from '../../assets/icons/icon_success.svg';
import IcoWarning from '../../assets/icons/icon_warning.svg';

import CloseButton from './CloseButton';
import StyledModal from './StyledModal';
import StyledHeader from './StyledHeader';
import StyledBody from './StyledBody';
import StyledFooter from './StyledFooter';
import Wrapper from './Wrapper';

import Close from '../../svgs/Close';

const icons = {
  danger: IcoDanger,
  info: IcoInfo,
  notFound: IcoNotFound,
  success: IcoSuccess,
  warning: IcoWarning,
};

function PopUpWarning({
  content,
  isOpen,
  onConfirm,
  onlyConfirmButton,
  popUpWarningType,
  toggleModal,
  ...rest
}) {
  const buttons = [
    {
      color: 'cancel',
      onClick: toggleModal,
      message: content.cancel || 'components.popUpWarning.button.cancel',
    },
    {
      color: 'delete',
      onClick: onConfirm,
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
    <Wrapper>
      <StyledModal isOpen={isOpen} toggle={toggleModal} {...rest}>
        <CloseButton onClick={toggleModal}>
          <Close fill="#c3c5c8" />
        </CloseButton>
        <StyledHeader toggle={toggleModal}>
          <FormattedMessage id={content.title || 'components.popUpWarning.title'} />
        </StyledHeader>
        <StyledBody>
          <div>
            <img src={icons[popUpWarningType]} alt="icon" />
            <p>
              <FormattedMessage id={content.message || 'components.popUpWarning.message'} />
            </p>
          </div>
        </StyledBody>
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
    </Wrapper>
  );
}

PopUpWarning.propTypes = {
  content: PropTypes.shape({
    cancel: PropTypes.string,
    confirm: PropTypes.string,
    message: PropTypes.string,
    title: PropTypes.string,
  }),
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
    title: 'components.popUpWarning.title',
  },
  onlyConfirmButton: false,
  popUpWarningType: 'danger',
};

export default PopUpWarning;
