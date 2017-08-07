/**
*
* PopUpWarning
*
*/

import React from 'react';
// modal
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class PopUpWarning extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.popUpWarning}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggleModal} className={styles.modalPosition}>
          <ModalHeader toggle={this.props.toggleModal} className={styles.header}>
            <FormattedMessage {...{id: 'popUpWarning.title'}} />
          </ModalHeader>
          <div className={styles.bordered} />


          <ModalBody className={styles.modalBody}>
            <FormattedMessage {...{id: this.props.warningMessage}} />
            <div className={styles.buttonContainer}>
              <FormattedMessage {...{id: 'form.button.cancel'}}>
                {(message) => (
                  <Button onClick={this.props.toggleModal} className={styles.secondary}>{message}</Button>
                )}
              </FormattedMessage>
              <FormattedMessage {...{id: 'form.button.confirm'}}>
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
  handleConfirm: React.PropTypes.func,
  isOpen: React.PropTypes.bool.isRequired,
  toggleModal: React.PropTypes.func.isRequired,
  warningMessage: React.PropTypes.string,
}

export default PopUpWarning;
