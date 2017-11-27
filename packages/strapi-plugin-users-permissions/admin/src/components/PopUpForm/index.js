/**
*
* PopUpForm
*
*/

import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { router } from 'app';

import Input from 'components/Input';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  toggleModal = () => router.push(router.location.pathname);

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
        <FormattedMessage id="users-permissions.PopUpForm.button.save" />
      </Button>
    );
  }

  renderForm = () => {
    if (this.props.settingType === 'providers') {
      return (
        <div className="row">
          <Input
            autoFocus
            label="users-permissions.PopUpForm.inputSelect.providers.label"
            name="provider"
            onChange={this.props.onChange}
            selectOptions={[{ value: 'Email'}, { value: 'Facebook' }, { value: 'Google' }]}
            type="select"
            validations={{ required: true }}
            value={get(this.props.values, 'provider')}
          />
          <div className="col-md-6" />
          <Input
            inputDescription="users-permissions.PopUpForm.inputToggle.providers.description"
            label="users-permissions.PopUpForm.inputToggle.providers.label"
            name="enabled"
            onChange={this.props.onChange}
            type="toggle"
            validations={{}}
            value={get(this.props.values, 'enabled')}
          />
        </div>
      );
    }

    return (
      <div className="row">
        <Input
          autoFocus
          label="users-permissions.PopUpForm.inputText.shipperName.label"
          name="shipperName"
          onChange={this.props.onChange}
          value={get(this.props.values, 'shipperName')}
          placeholder="users-permissions.PopUpForm.inputText.shipperName.placeholder"
          type="text"
          validations={{}}
        />
        <Input
          label="users-permissions.PopUpForm.inputEmail.shipperEmail.label"
          name="shipperEmail"
          onChange={this.props.onChange}
          placeholder="users-permissions.PopUpForm.inputEmail.placeholder"
          type="email"
          validations={{ required: true }}
          value={get(this.props.values, 'shipperEmail')}
        />
        <Input
          label="users-permissions.PopUpForm.inputEmail.responseEmail.label"
          name="responseEmail"
          onChange={this.props.onChange}
          placeholder="users-permissions.PopUpForm.inputEmail.placeholder"
          type="email"
          validations={{}}
          value={get(this.props.values, 'responseEmail')}
        />
        <div className="col-md-6" />
        <Input
          customBootstrapClass="col-md-12"
          label="users-permissions.PopUpForm.inputText.emailObject.label"
          name="emailObject"
          onChange={this.props.onChange}
          placeholder="users-permissions.PopUpForm.inputText.emailObject.placeholder"
          type="text"
          validations={{}}
          value={get(this.props.values, 'emailObject')}
        />
        <Input
          customBootstrapClass="col-md-12"
          label="users-permissions.PopUpForm.inputTextArea.message.label"
          name="message"
          onChange={this.props.onChange}
          placeholder="users-permissions.PopUpForm.inputTextArea.message.placeholder"
          type="textarea"
          validations={{}}
          value={get(this.props.values, 'message')}
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
                <FormattedMessage id={`users-permissions.PopUpForm.header.${this.props.actionType}.${this.props.settingType}`} />
              ) : <div />}
            </div>
          </div>
          <form onSubmit={this.props.onSubmit}>
            <ModalBody className={styles.modalBody}>
              <div className="container-fluid">
                {this.renderForm()}
              </div>
            </ModalBody>
            <ModalFooter className={styles.modalFooter}>
              <Button onClick={() => router.push(router.location.pathname)} className={styles.secondary}>
                <FormattedMessage id="users-permissions.PopUpForm.button.cancel" />
              </Button>
              {this.renderButton()}
            </ModalFooter>
          </form>
        </Modal>
      </div>
    );
  }
}

PopUpForm.defaultProps = {
  settingType: 'providers',
  showLoader: false,
};

PopUpForm.propTypes = {
  actionType: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  settingType: PropTypes.string,
  showLoader: PropTypes.bool,
  values: PropTypes.object.isRequired,
};

export default PopUpForm;
