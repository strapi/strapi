/**
*
* PopUpForm
*
*/

import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get, isObject, includes, map, take, takeRight } from 'lodash';

// Translations
import en from 'translations/en.json';

import Input from 'components/Input';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
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
    const { dataToEdit, values }  = this.props;

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

    const form = Object.keys(values.options || {}).reduce((acc, current) => {
      if (isObject(get(values, ['options', current]))) {
        return Object.keys(get(values, ['options', current], {}))
          .reduce((acc, curr) => {
            acc.push(`options.${current}.${curr}`);

            return acc;
          }, []).concat(acc);
      } else {
        acc.push(`options.${current}`);
      }

      return acc;
    }, []);

    return (
      <div className="row">
        {map(take(form, 3), (value, key) => (
          <Input
            autoFocus={key === 0}
            key={value}
            label={`users-permissions.PopUpForm.Email.${value}.label`}
            name={`${dataToEdit}.${value}`}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${value}.placeholder`}
            type={includes(value, 'email') ? 'email' : 'text'}
            value={get(values, value)}
            validations={{}}
          />
        ))}
        <div className="col-md-6" />
        {map(takeRight(form, 2), (value) => (
          <Input
            key={value}
            customBootstrapClass="col-md-12"
            label={`users-permissions.PopUpForm.Email.${value}.label`}
            name={`${dataToEdit}.${value}`}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${this.props.dataToEdit}.${value}.placeholder`}
            type={includes(value, 'object') ? 'text' : 'textarea'}
            validations={{}}
            value={get(values, value)}
          />
        ))}
      </div>
    );
  }

  render() {
    const { actionType, dataToEdit, display, settingType } = this.props.values;

    let header = <span>{dataToEdit}</span>;

    if (actionType) {
      header = <FormattedMessage id={`users-permissions.PopUpForm.header.${actionType}.${settingType}`} />;
    }

    if (display && en[display]) {
      header = <FormattedMessage id={`users-permissions.${display}`} />;
    }

    return (
      <div className={styles.popUpForm}>
        <Modal isOpen={this.props.isOpen} toggle={this.context.unsetDataToEdit} className={`${styles.modalPosition}`}>
          <ModalHeader toggle={this.context.unsetDataToEdit} className={styles.modalHeader} />
          <div className={styles.headerContainer}>
            <div>
              {header}
            </div>
          </div>
          <form onSubmit={this.props.onSubmit}>
            <ModalBody className={styles.modalBody}>
              <div className="container-fluid">
                {this.renderForm()}
              </div>
            </ModalBody>
            <ModalFooter className={styles.modalFooter}>
              <Button onClick={() => this.context.unsetDataToEdit()} className={styles.secondary}>
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

PopUpForm.contextTypes = {
  unsetDataToEdit: PropTypes.func.isRequired,
};

PopUpForm.defaultProps = {
  settingType: 'providers',
  showLoader: false,
};

PopUpForm.propTypes = {
  actionType: PropTypes.string.isRequired,
  dataToEdit: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  settingType: PropTypes.string,
  showLoader: PropTypes.bool,
  values: PropTypes.object.isRequired,
};

export default PopUpForm;
