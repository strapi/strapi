/**
*
* PopUpForm
*
*/

import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { capitalize, get, isArray, isObject, includes, map, tail, take, takeRight } from 'lodash';

// Translations
import en from 'translations/en.json';

import Input from 'components/Input';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { enabled: false };

  handleChange = (e) => {
    this.setState({ enabled: e.target.value });
    this.props.onChange(e);
  }

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
    const { dataToEdit, settingType, values }  = this.props;
    const form = Object.keys(values.options || values || {}).reduce((acc, current) => {
      const path = settingType === 'email-templates' ? ['options', current] : [ current ];
      const name = settingType === 'email-templates' ? 'options.' : '';

      if (isObject(get(values, path)) && !isArray(get(values, path))) {
        return Object.keys(get(values, path, {}))
          .reduce((acc, curr) => {
            acc.push(`${name}${current}.${curr}`);

            return acc;
          }, []).concat(acc);
      } else if (current !== 'icon' && current !== 'scope'){
        acc.push(`${name}${current}`);
      }

      return acc;
    }, []);

    if (settingType === 'providers') {
      return (
        <div className="row">
          <Input
            inputDescription="users-permissions.PopUpForm.Providers.enabled.description"
            label="users-permissions.PopUpForm.Providers.enabled.label"
            name={`${dataToEdit}.enabled`}
            onChange={this.handleChange}
            type="toggle"
            validations={{}}
            value={get(this.props.values, 'enabled', this.state.enabled)}
          />
          <div className={styles.separator} />
          {map(tail(form), (value, key) => (
            <Input
              autoFocus={key === 0}
              disabled={key === form.length - 2}
              key={value}
              customBootstrapClass="col-md-12"
              label={`users-permissions.PopUpForm.Providers.${ includes(value, 'callback') ? `${dataToEdit}.callback` : value}.label`}
              name={`${dataToEdit}.${value}`}
              onChange={this.props.onChange}
              type="text"
              value={includes(value, 'callback') ? `${strapi.backendURL}${get(values, value)}` : get(values, value)}
              validations={{}}
            />
          ))}
        </div>
      );
    }

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
    const { display } = this.props.values;
    const { actionType, dataToEdit, settingType } = this.props;

    let header = <span>{dataToEdit}</span>;

    if (actionType) {
      header = <FormattedMessage id={`users-permissions.PopUpForm.header.${actionType}.${settingType}`} values={{ provider: <i>{capitalize(dataToEdit)}</i> }} />;
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
