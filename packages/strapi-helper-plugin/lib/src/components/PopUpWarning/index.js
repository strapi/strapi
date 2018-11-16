/**
*
* PopUpWarning
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

// modal
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import IcoDanger from '../../assets/icons/icon_danger.svg';
import IcoNotFound from '../../assets/icons/icon_flag_not_found.svg';
import IcoInfo from '../../assets/icons/icon_info.svg';
import IcoSuccess from '../../assets/icons/icon_success.svg';
import IcoWarning from '../../assets/icons/icon_warning.svg';
import styles from './styles.scss';

const icons = {
  'danger': IcoDanger,
  'info': IcoInfo,
  'notFound': IcoNotFound,
  'success': IcoSuccess,
  'warning': IcoWarning,
};

function PopUpWarning({ content, isOpen, onConfirm, onlyConfirmButton, popUpWarningType, toggleModal }) {
  const buttons = [
    {
      className: styles.secondary,
      id: 'ctaCancel',
      handleClick: toggleModal,
      message: content.cancel || 'components.popUpWarning.button.cancel',
      style: {},
    },
    {
      className: styles.primary,
      id: 'ctaConfirm',
      handleClick: onConfirm,
      message: content.confirm || 'components.popUpWarning.button.confirm',
      style: {},
    },
  ];
  const singleButton = [
    {
      className: styles.primary,
      id: 'ctaConfirm',
      handleClick: onConfirm,
      message: content.confirm || 'components.popUpWarning.button.confirm',
      style: { width: '100%' },
    },
  ];
  const footerButtons = onlyConfirmButton ? singleButton : buttons;

  return (
    <div className={styles.popUpWarningHelper}>
      <Modal isOpen={isOpen} toggle={toggleModal} className={styles.modalPosition}>
        <ModalHeader toggle={toggleModal} className={styles.popUpWarningHeader}>
          <FormattedMessage id={content.title || 'components.popUpWarning.title'} />
        </ModalHeader>
        <ModalBody className={styles.modalBodyHelper}>
          <div className={styles.modalBodyContainerHelper}>
            <img src={icons[popUpWarningType]} alt="icon" />
            <FormattedMessage id={content.message || 'components.popUpWarning.message'}>
              {(message) => (
                <p>{message}</p>
              )}
            </FormattedMessage>
          </div>
          <div className={styles.popUpWarningButtonContainer}>
            {map(footerButtons, (button) => (
              <FormattedMessage id={button.message} key={button.id}>
                {(message) => <Button onClick={button.handleClick} className={button.className} id={button.id} style={button.style}>{message}</Button>}
              </FormattedMessage>
            ))}
          </div>
        </ModalBody>
      </Modal>
    </div>
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
