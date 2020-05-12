/**
 *
 * PopUpWarning
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

// modal
import { Button } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import IcoDanger from '../../assets/icons/icon_danger.svg';
import IcoNotFound from '../../assets/icons/icon_flag_not_found.svg';
import IcoInfo from '../../assets/icons/icon_info.svg';
import IcoSuccess from '../../assets/icons/icon_success.svg';
import IcoWarning from '../../assets/icons/icon_warning.svg';
import StyledModal from './StyledModal';
import StyledHeader from './StyledHeader';
import StyledBody from './StyledBody';
import Wrapper from './Wrapper';

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
}) {
  const buttons = [
    {
      className: 'secondary',
      id: 'ctaCancel',
      handleClick: toggleModal,
      message: content.cancel || 'components.popUpWarning.button.cancel',
      style: {},
    },
    {
      className: 'primary',
      id: 'ctaConfirm',
      handleClick: onConfirm,
      message: content.confirm || 'components.popUpWarning.button.confirm',
      style: {},
    },
  ];
  const singleButton = [
    {
      className: 'primary',
      id: 'ctaConfirm',
      handleClick: onConfirm,
      message: content.confirm || 'components.popUpWarning.button.confirm',
      style: { width: '100%' },
    },
  ];
  const footerButtons = onlyConfirmButton ? singleButton : buttons;

  return (
    <Wrapper>
      <StyledModal isOpen={isOpen} toggle={toggleModal}>
        <StyledHeader toggle={toggleModal}>
          <FormattedMessage
            id={content.title || 'components.popUpWarning.title'}
          />
        </StyledHeader>
        <StyledBody>
          <div className="modalBodyContainerHelper">
            <img src={icons[popUpWarningType]} alt="icon" />
            <FormattedMessage
              id={content.message || 'components.popUpWarning.message'}
            >
              {message => <p>{message}</p>}
            </FormattedMessage>
          </div>
          <div className="popUpWarningButtonContainer">
            {map(footerButtons, button => (
              <FormattedMessage id={button.message} key={button.id}>
                {message => (
                  <Button
                    onClick={button.handleClick}
                    className={button.className}
                    id={button.id}
                    style={button.style}
                  >
                    {message}
                  </Button>
                )}
              </FormattedMessage>
            ))}
          </div>
        </StyledBody>
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
