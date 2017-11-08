/**
*
* PopUpForm
*
*/

import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { router } from 'app';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import Input from 'components/Input';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  toggleModal = () => router.push(router.location.pathname);
  state = { value: '' }

  renderButton = () => {
    if (this.props.showLoader) {
      return (
        <Button onClick={() => {}} type="submit" className={styles.primary} disabled>
          <p className={styles.saving}>
            <span>.</span><span>.</span><span>.</span>
          </p>
        </Button>
      );
    }

    return (
      <Button type="submit" onClick={this.props.onSubmit} className={styles.primary}>
        <FormattedMessage id="users-permissions.popUpForm.button.save" />
      </Button>
    );
  }

  renderForm = () => {
    if (this.props.settingType === 'providers') {
      return (
        <div className="row">
          <Input
            label="users-permissions.popUpForm.inputSelect.providers.label"
            name="provider"
            onChange={() => console.log('change')}
            selectOptions={[{ value: 'Email'}, { value: 'Facebook' }, { value: 'Google' }]}
            type="select"
            validations={{ required: true }}
            value="email"
          />
          <div className="col-md-6" />
          <Input
            inputDescription="users-permissions.popUpForm.inputToggle.providers.description"
            label="users-permissions.popUpForm.inputToggle.providers.label"
            name="enabled"
            onChange={() => console.log('change')}
            value={true}
            type="toggle"
            validations={{}}
          />
        </div>
      );
    }

    return (
      <div className="row">
        <Input
          label="users-permissions.popUpForm.inputText.shipperName.label"
          name="shipperName"
          onChange={() => console.log('change')}
          value=""
          placeholder="users-permissions.popUpForm.inputText.shipperName.placeholder"
          type="text"
          validations={{}}
          autoFocus
        />
        <Input
          label="users-permissions.popUpForm.inputEmail.shipperEmail.label"
          name="shipperEmail"
          onChange={({ target }) => this.setState({ value: target.value })}
          value={this.state.value}
          placeholder="users-permissions.popUpForm.inputEmail.placeholder"
          type="email"
          validations={{ required: true }}
        />
        <Input
          label="users-permissions.popUpForm.inputEmail.responseEmail.label"
          name="responseEmail"
          onChange={() => console.log('change')}
          value=""
          placeholder="users-permissions.popUpForm.inputEmail.placeholder"
          type="email"
          validations={{}}
        />
        <div className="col-md-6" />
          <Input
            customBootstrapClass="col-md-12"
            label="users-permissions.popUpForm.inputText.emailObject.label"
            name="emailObject"
            onChange={() => console.log('change')}
            value=""
            placeholder="users-permissions.popUpForm.inputText.emailObject.placeholder"
            type="text"
            validations={{}}
          />
          <Input
            customBootstrapClass="col-md-12"
            label="users-permissions.popUpForm.inputTextArea.message.label"
            name="message"
            onChange={() => console.log('change')}
            value=""
            placeholder="users-permissions.popUpForm.inputTextArea.message.placeholder"
            type="textarea"
            validations={{}}
          />
      </div>
    );
  }

  render() {
    return (
      <div className={styles.popUpForm}>
        <Modal isOpen={this.props.isOpen} toggle={this.toggleModal} className={`${styles.modalPosition}`}>
          <ModalHeader toggle={this.toggleModal} className={styles.modalHeader} />
          <div className={styles.headerContainer}>
            <div>
              {this.props.actionType ? (
                <FormattedMessage id={`users-permissions.popUpForm.header.${this.props.actionType}.${this.props.settingType}`} />
              ) : <div />}
            </div>
          </div>
          <ModalBody className={styles.modalBody}>
            <div className="container-fluid">
              {this.renderForm()}
            </div>
          </ModalBody>
          <ModalFooter className={styles.modalFooter}>
            <Button onClick={this.toggleModal} className={styles.secondary}>
              <FormattedMessage id="users-permissions.popUpForm.button.cancel" />
            </Button>
            {this.renderButton()}
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

PopUpForm.proptypes = {
  actionType: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  settingType: PropTypes.string.isRequired,
};

export default PopUpForm;
