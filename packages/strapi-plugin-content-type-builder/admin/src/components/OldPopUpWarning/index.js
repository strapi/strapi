/**
*
* PopUpWarning
*
*/

import React from 'react';
import PropTypes from 'prop-types';

// modal
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';

import { FormattedMessage } from 'react-intl';
import IcoDanger from '../../assets/icons/icon_danger.svg';
import IcoNotFound from '../../assets/icons/icon_flag_not_found.svg';
import IcoInfo from '../../assets/icons/icon_info.svg';
import IcoSuccess from '../../assets/icons/icon_success.svg';
import IcoWarning from '../../assets/icons/icon_warning.svg';
import styles from './styles.scss';

/* eslint-disable react/jsx-handler-names */
/* eslint-disable react/require-default-props */
class PopUpWarning extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.icons = {
      'danger': IcoDanger,
      'info': IcoInfo,
      'notFound': IcoNotFound,
      'success': IcoSuccess,
      'warning': IcoWarning,
    };
  }

  render() {
    return (
      <div className={styles.popUpWarning}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggleModal} className={styles.modalPosition}>
          <ModalHeader toggle={this.props.toggleModal} className={styles.header}>
            <FormattedMessage id="content-type-builder.popUpWarning.title" />
          </ModalHeader>
          <div className={styles.bordered} />
          <ModalBody>
            <div className={styles.modalDangerBodyContainer}>
              <img src={this.icons[this.props.popUpWarningType]} alt="icon" />
              <FormattedMessage id={this.props.bodyMessage}>
                {(message) => (
                  <p>{message}</p>
                )}
              </FormattedMessage>
            </div>
            <div className={styles.buttonContainer}>
              <FormattedMessage id="content-type-builder.popUpWarning.button.cancel">
                {(message) => (
                  <Button onClick={this.props.toggleModal} className={styles.secondary}>{message}</Button>
                )}
              </FormattedMessage>
              <FormattedMessage id="content-type-builder.popUpWarning.button.confirm">
                {(message) => (
                  <Button onClick={this.props.handleConfirm} className={styles.primary}>{message}</Button>
                )}
              </FormattedMessage>
            </div>
          </ModalBody>

        </Modal>
      </div>
    );
  }
}

PopUpWarning.propTypes = {
  bodyMessage: PropTypes.string,
  handleConfirm: PropTypes.func,
  isOpen: PropTypes.bool.isRequired,
  popUpWarningType: PropTypes.string,
  toggleModal: PropTypes.func.isRequired,
};

export default PopUpWarning;
