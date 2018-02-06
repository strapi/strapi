/**
*
* PopUpForm
*
*/

import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import {
  capitalize,
  get,
  findIndex,
  isArray,
  isEmpty,
  isObject,
  includes,
  map,
  startsWith,
  tail,
  take,
  takeRight,
} from 'lodash';

// Translations
import en from 'translations/en.json';

import Input from 'components/InputsIndex';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { enabled: false, isEditing: false };

  componentWillReceiveProps(nextProps) {
    const { values } = nextProps;

    if (get(values, 'enabled') && get(values, 'enabled') !== get(this.props.values, 'enabled')) {
      this.setState({ enabled: get(values, 'enabled') });
    }
  }

  getRedirectURIProviderConf = () => { // NOTE: Still testings providers so the switch statement is likely to change
    switch (this.props.dataToEdit) {
      case 'facebook':
        return `${strapi.backendURL}/connect/facebook/callback`;
      case 'google':
        return `${strapi.backendURL}/connect/google/callback`;
      case 'github':
        return get(this.props.values, 'redirect_uri', '');
      default: {
        const value = get(this.props.values, 'callback', '');

        return startsWith(value, 'http') ? value : `${strapi.backendURL}${value}`;
      }
    }
  }

  generateRedirectURL = (url) => {
    return startsWith(url, 'https://') || startsWith(url, 'http://') || this.state.isEditing ? url : `${strapi.backendURL}${startsWith(url, '/') ? '' : '/'}${url}`;
  }

  handleChange = (e) => {
    this.setState({ enabled: e.target.value });
    this.props.onChange(e);
  }

  handleBlur = (e) => {
    this.setState({ isEditing: false });

    if (isEmpty(e.target.value)) {
      const { name, type } = e.target;
      const target = Object.assign({ name, type }, { value: `/auth/${this.props.dataToEdit}/callback` });
      this.props.onChange({ target });
    }
  }

  handleFocus = () => this.setState({ isEditing: true });

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
        <div className={`row ${styles.providerDisabled}`}>
          <Input
            inputDescription={{ id: 'users-permissions.PopUpForm.Providers.enabled.description' }}
            label={{ id: 'users-permissions.PopUpForm.Providers.enabled.label' }}
            name={`${dataToEdit}.enabled`}
            onChange={this.handleChange}
            type="toggle"
            validations={{}}
            value={get(this.props.values, 'enabled', this.state.enabled)}
          />

          {form.length > 1 && <div className={styles.separator} /> }

          {map(tail(form), (value, key) => (
            <Input
              autoFocus={key === 0}
              customBootstrapClass="col-md-12"
              didCheckErrors={this.props.didCheckErrors}
              errors={get(this.props.formErrors, [findIndex(this.props.formErrors, ['name', value]), 'errors'], [])}
              key={value}
              label={{ id: `users-permissions.PopUpForm.Providers.${ includes(value, 'callback') || includes(value, 'redirect_uri') ? 'redirectURL.front-end' : value}.label` }}
              name={`${dataToEdit}.${value}`}
              onFocus={includes(value, 'callback') || includes(value, 'redirect_uri') ? this.handleFocus : () => {}}
              onBlur={includes(value, 'callback') || includes(value, 'redirect_uri') ? this.handleBlur : false}
              onChange={this.props.onChange}
              type="text"
              value={includes(value, 'callback') || includes(value, 'redirect_uri') ? this.generateRedirectURL(get(values, value)) : get(values, value)}
              validations={{ required: true }}
            />
          ))}
          { dataToEdit !== 'email' && (
            <Input
              customBootstrapClass="col-md-12"
              disabled
              label={{ id: `users-permissions.PopUpForm.Providers.${dataToEdit}.providerConfig.redirectURL` }}
              name="noName"
              type="text"
              onChange={() => {}}
              value={this.getRedirectURIProviderConf()}
              validations={{}}
            />
          )}
        </div>
      );
    }

    const params = {
      link: (
        <a href="https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/docs/email-templates.md" target="_blank">
          <FormattedMessage id="users-permissions.PopUpForm.Email.link.documentation" />
        </a>
      ),
    };

    return (
      <div className="row">
        {map(take(form, 3), (value, key) => (
          <Input
            autoFocus={key === 0}
            key={value}
            didCheckErrors={this.props.didCheckErrors}
            errors={get(this.props.formErrors, [findIndex(this.props.formErrors, ['name', value]), 'errors'], [])}
            label={{ id: `users-permissions.PopUpForm.Email.${value}.label` }}
            name={`${dataToEdit}.${value}`}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${value}.placeholder`}
            type={includes(value, 'email') ? 'email' : 'text'}
            value={get(values, value)}
            validations={value !== 'options.response_email' ? { required: true } : {}}
          />
        ))}
        <div className="col-md-6" />
        {map(takeRight(form, 2), (value) => (
          <Input
            key={value}
            customBootstrapClass="col-md-12"
            didCheckErrors={this.props.didCheckErrors}
            errors={get(this.props.formErrors, [findIndex(this.props.formErrors, ['name', value]), 'errors'], [])}
            label={{ id: `users-permissions.PopUpForm.Email.${value}.label` }}
            name={`${dataToEdit}.${value}`}
            inputDescription={{
              id: includes(value, 'object') ? 'users-permissions.PopUpForm.Email.email_templates.inputDescription' : '',
              params,
            }}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${this.props.dataToEdit}.${value}.placeholder`}
            type={includes(value, 'object') ? 'text' : 'textarea'}
            validations={{ required: true }}
            value={get(values, value)}
            inputStyle={!includes(value, 'object') ? { height: '16rem' } : {}}
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
              <Button type="submit" onClick={this.props.onSubmit} className={styles.primary}>
                <FormattedMessage id="users-permissions.PopUpForm.button.save" />
              </Button>
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
  // showLoader: false,
};

PopUpForm.propTypes = {
  actionType: PropTypes.string.isRequired,
  dataToEdit: PropTypes.string.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  settingType: PropTypes.string,
  // showLoader: PropTypes.bool,
  values: PropTypes.object.isRequired,
};

export default PopUpForm;
