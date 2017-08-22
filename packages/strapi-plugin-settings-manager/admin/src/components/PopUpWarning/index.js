/**
*
* PopUpWarning
*
*/

import React from 'react';
// modal
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import Danger from '../../assets/icons/icon_danger.svg';
import styles from './styles.scss';

class PopUpWarning extends React.Component { // eslint-disable-line react/prefer-stateless-function
  renderModalBodyDanger = () => (
    <ModalBody>
      <div className={styles.modalDangerBodyContainer}>
        <img src={Danger} alt="icon" />
        <FormattedMessage id={`settings-manager.${this.props.dangerMessage}`}>
          {(message) => (
            <p>{message}</p>
          )}
        </FormattedMessage>
      </div>
      <div className={styles.buttonDangerContainer}>
        <Button onClick={this.props.handleConfirmDanger} className={styles.primary}>
          <FormattedMessage id="settings-manager.popUpWarning.danger.ok.message" />
        </Button>
      </div>
    </ModalBody>
  )

  renderModalBody = () => (
    <ModalBody className={styles.modalBody}>
      <FormattedMessage id={`settings-manager.${this.props.warningMessage}`} />
      <div className={styles.buttonContainer}>
        <FormattedMessage id="settings-manager.form.button.cancel">
          {(message) => (
            <Button onClick={this.props.toggleModal} className={styles.secondary}>{message}</Button>
          )}
        </FormattedMessage>
        <FormattedMessage id="settings-manager.form.button.confirm">
          {(message) => (
            <Button onClick={this.props.handleConfirm} className={styles.primary}>{message}</Button>
          )}
        </FormattedMessage>
      </div>
    </ModalBody>
  )

  render() {
    const modalBody = this.props.showDanger ? this.renderModalBodyDanger() : this.renderModalBody();
    return (
      <div className={styles.popUpWarning}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggleModal} className={styles.modalPosition}>
          <ModalHeader toggle={this.props.toggleModal} className={styles.header}>
            <FormattedMessage id="settings-manager.popUpWarning.title" />
          </ModalHeader>
          <div className={styles.bordered} />


          {modalBody}

        </Modal>
      </div>
    );
  }
}

PopUpWarning.propTypes = {
  dangerMessage: React.PropTypes.string.isRequired,
  handleConfirm: React.PropTypes.func.isRequired,
  handleConfirmDanger: React.PropTypes.func.isRequired,
  isOpen: React.PropTypes.bool.isRequired,
  showDanger: React.PropTypes.bool.isRequired,
  toggleModal: React.PropTypes.func.isRequired,
  warningMessage: React.PropTypes.string.isRequired,
}

export default PopUpWarning;
