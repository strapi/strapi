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
            <FormattedMessage id={this.props.content.title || 'components.popUpWarning.title'} />
          </ModalHeader>
          <div className={styles.bordered} />
          <ModalBody>
            <div className={styles.modalDangerBodyContainer}>
              <img src={this.icons[this.props.popUpWarningType]} alt="icon" />
              <FormattedMessage id={this.props.content.message || 'components.popUpWarning.message'}>
                {(message) => (
                  <p>{message}</p>
                )}
              </FormattedMessage>
            </div>
            <div className={styles.buttonContainer}>
              <FormattedMessage id={this.props.content.cancel || 'components.popUpWarning.button.cancel'}>
                {(message) => (
                  <Button onClick={this.props.toggleModal} className={styles.secondary}>{message}</Button>
                )}
              </FormattedMessage>
              <FormattedMessage id={this.props.content.confirm || 'components.popUpWarning.button.confirm'}>
                {(message) => (
                  <Button onClick={this.props.onConfirm} className={styles.primary}>{message}</Button>
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
  content: PropTypes.shape({
    cancel: PropTypes.string,
    confirm: PropTypes.string,
    message: PropTypes.string,
    title: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
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
  popUpWarningType: 'danger',
};

export default PopUpWarning;
