/**
 *
 * PopUpForm
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import {
  capitalize,
  get,
  has,
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
import {
  ButtonModal,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
  InputsIndex as Input,
} from 'strapi-helper-plugin';
import { HomePageContext } from '../../contexts/HomePage';

// Translations
import en from '../../translations/en.json';

/* eslint-disable react/sort-comp */
/* eslint-disable no-shadow */
class PopUpForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { enabled: false };

  static contextType = HomePageContext;

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { values } = nextProps;

    if (get(values, 'enabled') && get(values, 'enabled') !== get(this.props.values, 'enabled')) {
      this.setState({ enabled: get(values, 'enabled') });
    }
  }

  getRedirectURIProviderConf = () => {
    let redirectUri;

    if (has(this.props.values, 'redirectUri')) {
      return get(this.props.values, 'redirectUri', '');
    }

    switch (this.props.dataToEdit) {
      case 'discord':
        return `${strapi.backendURL}/connect/discord/callback`;
      case 'facebook':
        return `${strapi.backendURL}/connect/facebook/callback`;
      case 'google':
        return `${strapi.backendURL}/connect/google/callback`;
      case 'github':
        return `${strapi.backendURL}/connect/github/callback`;
      case 'microsoft':
        return `${strapi.backendURL}/connect/microsoft/callback`;
      case 'twitter':
        return `${strapi.backendURL}/connect/twitter/callback`;
      case 'instagram':
        return `${strapi.backendURL}/connect/instagram/callback`;
      case 'vk':
        return `${strapi.backendURL}/connect/vk/callback`;
      case 'twitch':
        return `${strapi.backendURL}/connect/twitch/callback`;
      default:
        return this.props.dataToEdit
          ? `${strapi.backendURL}/connect/${this.props.dataToEdit}/callback`
          : '';
    }
  };

  handleChange = e => {
    this.setState({ enabled: e.target.value });
    this.props.onChange(e);
  };

  renderForm = () => {
    const { dataToEdit, didCheckErrors, formErrors, settingType, values } = this.props;
    const form = Object.keys(values.options || values || {}).reduce((acc, current) => {
      const path = settingType === 'email-templates' ? ['options', current] : [current];
      const name = settingType === 'email-templates' ? 'options.' : '';

      if (isObject(get(values, path)) && !isArray(get(values, path))) {
        return Object.keys(get(values, path, {}))
          .reduce((acc, curr) => {
            acc.push(`${name}${current}.${curr}`);

            return acc;
          }, [])
          .concat(acc);
      }
      if (current !== 'icon' && current !== 'scope') {
        acc.push(`${name}${current}`);
      }

      return acc;
    }, []);

    if (settingType === 'providers') {
      return (
        <>
          <Input
            inputDescription={{
              id: 'users-permissions.PopUpForm.Providers.enabled.description',
            }}
            label={{
              id: 'users-permissions.PopUpForm.Providers.enabled.label',
            }}
            name={`${settingType}.${dataToEdit}.enabled`}
            onChange={this.handleChange}
            type="toggle"
            validations={{}}
            value={get(values, 'enabled', this.state.enabled)}
          />

          {map(tail(form), (value, key) => (
            <Input
              autoFocus={key === 0}
              customBootstrapClass="col-md-12"
              didCheckErrors={didCheckErrors}
              errors={get(formErrors, [findIndex(formErrors, ['name', value]), 'errors'], [])}
              key={value}
              label={{
                id:
                  value === 'redirectUri'
                    ? `users-permissions.PopUpForm.Providers.${dataToEdit}.${value}.label`
                    : `users-permissions.PopUpForm.Providers.${value}.label`,
              }}
              name={`${settingType}.${dataToEdit}.${value}`}
              onChange={this.props.onChange}
              type="text"
              disabled={value === 'redirectUri'}
              value={get(values, value)}
              validations={{ required: true }}
            />
          ))}
        </>
      );
    }

    const params = {
      link: (
        <a
          href="https://strapi.io/documentation/v3.x/plugins/users-permissions.html#templating-emails"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FormattedMessage id="users-permissions.PopUpForm.Email.link.documentation" />
        </a>
      ),
    };

    return (
      <>
        {map(take(form, 3), (value, key) => (
          <Input
            autoFocus={key === 0}
            key={value}
            didCheckErrors={this.props.didCheckErrors}
            errors={get(
              this.props.formErrors,
              [findIndex(this.props.formErrors, ['name', value]), 'errors'],
              []
            )}
            label={{ id: `users-permissions.PopUpForm.Email.${value}.label` }}
            name={`${settingType}.${dataToEdit}.${value}`}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${value}.placeholder`}
            type={includes(value, 'email') ? 'email' : 'text'}
            value={get(values, value)}
            validations={value !== 'options.response_email' ? { required: true } : {}}
          />
        ))}
        <div className="col-md-6" />
        {map(takeRight(form, 2), value => (
          <Input
            key={value}
            customBootstrapClass="col-md-12"
            didCheckErrors={this.props.didCheckErrors}
            errors={get(
              this.props.formErrors,
              [findIndex(this.props.formErrors, ['name', value]), 'errors'],
              []
            )}
            label={{ id: `users-permissions.PopUpForm.Email.${value}.label` }}
            name={`${settingType}.${dataToEdit}.${value}`}
            inputDescription={{
              id: includes(value, 'object')
                ? 'users-permissions.PopUpForm.Email.email_templates.inputDescription'
                : '',
              params,
            }}
            onChange={this.props.onChange}
            placeholder={`users-permissions.PopUpForm.Email.${this.props.dataToEdit}.${value}.placeholder`}
            type={includes(value, 'object') ? 'text' : 'textarea'}
            validations={{ required: true }}
            value={get(values, value)}
            inputStyle={
              !includes(value, 'object') ? { height: '16rem', marginBottom: '-0.8rem' } : {}
            }
          />
        ))}
      </>
    );
  };

  render() {
    const { display } = this.props.values;
    const { actionType, dataToEdit, isOpen, onSubmit, settingType } = this.props;

    let header = <span>{dataToEdit}</span>;

    if (actionType) {
      header = (
        <FormattedMessage
          id={`users-permissions.PopUpForm.header.${actionType}.${settingType}`}
          values={{ provider: <i>{capitalize(dataToEdit)}</i> }}
        />
      );
    }

    const subHeader =
      display && en[display] ? (
        <FormattedMessage id={`users-permissions.${display}`} />
      ) : (
        <span>{capitalize(dataToEdit)}</span>
      );

    return (
      <Modal isOpen={isOpen} onToggle={this.context.unsetDataToEdit}>
        <HeaderModal>
          <section>
            <HeaderModalTitle>{header}</HeaderModalTitle>
          </section>
          <section>
            <HeaderModalTitle>{subHeader}</HeaderModalTitle>
            <hr />
          </section>
        </HeaderModal>
        <form onSubmit={onSubmit}>
          <ModalForm>
            <ModalBody>{this.renderForm()}</ModalBody>
          </ModalForm>
          <ModalFooter>
            <section>
              <ButtonModal
                message="components.popUpWarning.button.cancel"
                onClick={this.context.unsetDataToEdit}
                isSecondary
              />
              <ButtonModal message="form.button.done" onClick={onSubmit} type="submit" />
            </section>
          </ModalFooter>
        </form>
      </Modal>
    );
  }
}

PopUpForm.defaultProps = {
  settingType: 'providers',
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
  values: PropTypes.object.isRequired,
};

export default PopUpForm;
