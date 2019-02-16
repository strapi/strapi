/**
 *
 * AuthPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { findIndex, get, isBoolean, isEmpty, map, replace } from 'lodash';
import cn from 'classnames';
import pluginId from 'pluginId';

// Logo
import LogoStrapi from 'assets/images/logo_strapi.png';

// Design
import Button from 'components/Button';
import Input from 'components/InputsIndex';

// Utils
import auth from 'utils/auth';

import {
  hideLoginErrorsInput,
  onChangeInput,
  setErrors,
  setForm,
  submit,
} from './actions';
import form from './form.json';
import reducer from './reducer';
import saga from './saga';
import makeSelectAuthPage from './selectors';

import styles from './styles.scss';

export class AuthPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    auth.clearAppStorage();
    this.setForm();
  }

  componentDidUpdate(prevProps) {
    const { 
      hideLoginErrorsInput,
      match: { 
        params : {
          authType,
        },
      }, 
      submitSuccess,
    } = this.props;

    if (authType !== prevProps.match.params.authType) {
      this.setForm();
      hideLoginErrorsInput(false);
    }

    if (submitSuccess) {
      switch (authType) {
        case 'login':
        case 'reset-password': 
          // Check if we have token to handle redirection to login or admin.
          // Done to prevent redirection to admin after reset password if user should
          // not have access.
          auth.getToken()
            ? this.redirect('/')
            : this.redirect('/plugins/users-permissions/auth/login');
          break;
        case 'register':
          this.redirect('/');
          // NOTE: prepare for comfirm email;
          // this.redirect(`/plugins/users-permissions/auth/register-success/${this.props.modifiedData.email}`);
          break;
        default:
      }
    }
  }

  // Get form Errors shortcut.
  getFormErrors = () => {
    const { formErrors } = this.props;
    return get(formErrors, ['0', 'errors', '0', 'id']);
  }

  setForm = () => {
    const {
      location: {
        search,
      },
      match: {
        params: {
          authType,
          id,
        },
      },
      setForm, 
    } = this.props; 
    const params = search ? replace(search, '?code=', '') : id;
    
    setForm(authType, params);
  }

  isAuthType = type => {
    const { match: { params: { authType } } } = this.props;
    return authType === type;
  }
  
  handleSubmit = (e) => {
    const { modifiedData, setErrors, submit } = this.props;
    e.preventDefault();
    const formErrors = Object.keys(modifiedData).reduce((acc, key) => {
      if (isEmpty(get(modifiedData, key)) && !isBoolean(get(modifiedData, key))) {
        acc.push({ name: key, errors: [{ id: 'components.Input.error.validation.required' }] });
      }

      if (!isEmpty(get(modifiedData, 'password')) && !isEmpty(get(modifiedData, 'confirmPassword')) && findIndex(acc, ['name', 'confirmPassword']) === -1) {
        if (modifiedData.password.length < 6) {
          acc.push({ name: 'password', errors: [{ id: 'users-permissions.components.Input.error.password.length' }] });
        }
        
        if (get(modifiedData, 'password') !== get(modifiedData, 'confirmPassword')) {
          acc.push({ name: 'confirmPassword', errors: [{ id: 'users-permissions.components.Input.error.password.noMatch' }] });
        }
      }

      return acc;
    }, []);

    setErrors(formErrors);

    if (isEmpty(formErrors)) {
      submit(this.context);
    }
  }

  redirect = path => this.props.history.push(path);

  renderButton = () => {
    const { match: { params: { authType } }, submitSuccess } = this.props;

    if (this.isAuthType('login')) {
      return (
        <div className={cn('col-md-6', styles.loginButton)}>
          <Button primary label="users-permissions.Auth.form.button.login" type="submit" />
        </div>
      );
    }
    const isEmailForgotSent = this.isAuthType('forgot-password') && submitSuccess;
    const label = isEmailForgotSent ? 'users-permissions.Auth.form.button.forgot-password.success' : `users-permissions.Auth.form.button.${authType}`;
  
    return (
      <div className={cn('col-md-12', styles.buttonContainer)}>
        <Button
          className={cn(isEmailForgotSent && styles.buttonForgotSuccess)}
          label={label}
          style={{ width: '100%' }}
          primary={!isEmailForgotSent}
          type="submit"
        />
      </div>
    );
  }

  renderLogo = () => this.isAuthType('register') && <div className={styles.logoContainer}><img src={LogoStrapi} alt="logo" /></div>;
  
  renderLink = () => {
    if (this.isAuthType('login')) {
      return (
        <Link to="/plugins/users-permissions/auth/forgot-password">
          <FormattedMessage id="users-permissions.Auth.link.forgot-password" />
        </Link>
      );
    }

    if (this.isAuthType('forgot-password') || this.isAuthType('register-success')) {
      return (
        <Link to="/plugins/users-permissions/auth/login">
          <FormattedMessage id="users-permissions.Auth.link.ready" />
        </Link>
      );
    }

    return <div />;
  }

  renderInputs = () => {
    const { 
      didCheckErrors,
      formErrors,
      match: {
        params: {
          authType,
        },
      },
      modifiedData,
      noErrorsDescription,
      onChangeInput,
      submitSuccess,
    } = this.props;
    
    const inputs = get(form, ['form', authType]);
    const isForgotEmailSent = this.isAuthType('forgot-password') && submitSuccess;
    return map(inputs, (input, key) => {
      const label = 
        isForgotEmailSent
          ? { id: 'users-permissions.Auth.form.forgot-password.email.label.success' } 
          : get(input, 'label');
          
      return (
        <Input
          autoFocus={key === 0}
          customBootstrapClass={get(input, 'customBootstrapClass')}
          didCheckErrors={didCheckErrors}
          errors={get(formErrors, [findIndex(formErrors, ['name', input.name]), 'errors'])}
          key={get(input, 'name')}
          label={label}
          name={get(input, 'name')}
          onChange={onChangeInput}
          placeholder={get(input, 'placeholder')}
          type={get(input, 'type')}
          validations={{ required: true }}
          value={get(modifiedData, get(input, 'name'), get(input, 'value'))}
          noErrorsDescription={noErrorsDescription}
        />
      );
    });
  }

  render() {
    const { modifiedData, noErrorsDescription, submitSuccess } = this.props;
    let divStyle = this.isAuthType('register') ? { marginTop: '3.2rem' } : { marginTop: '.9rem' };

    if (this.isAuthType('forgot-password') && submitSuccess) {
      divStyle = { marginTop: '.9rem', minHeight: '18.2rem' };
    }

    return (
      <div className={styles.authPage}>
        <div className={styles.wrapper}>
          <div className={styles.headerContainer}>
            {this.isAuthType('register') ? (
              <FormattedMessage id="users-permissions.Auth.form.header.register" />
            ) : (
              <img src={LogoStrapi} alt="logo" />
            )}
          </div>
          <div className={styles.headerDescription}>
            {this.isAuthType('register') && <FormattedMessage id="users-permissions.Auth.header.register.description" />}
          </div>

          <div
            className={cn(
              styles.formContainer,
              this.isAuthType('forgot-password') && submitSuccess ? styles.borderedSuccess : styles.bordered,
            )}
            style={divStyle}
          >
            <form onSubmit={this.handleSubmit}>
              <div className="container-fluid">
                {noErrorsDescription && !isEmpty(this.getFormErrors())? (
                  <div className={styles.errorsContainer}>
                    <FormattedMessage id={this.getFormErrors()} />
                  </div>
                ): ''}
                <div className="row" style={{ textAlign: 'start' }}>
                  {!submitSuccess && this.renderInputs()}
                  { this.isAuthType('forgot-password') && submitSuccess && (
                    <div className={styles.forgotSuccess}>
                      <FormattedMessage id="users-permissions.Auth.form.forgot-password.email.label.success" />
                      <br />
                      <p>{get(modifiedData, 'email', '')}</p>
                    </div>
                  )}
                  {this.renderButton()}
                </div>
              </div>
            </form>
          </div>
          <div className={styles.linkContainer}>
            {this.renderLink()}
          </div>
        </div>
        {this.renderLogo()}
      </div>
    );
  }
}

AuthPage.contextTypes = {
  updatePlugin: PropTypes.func,
};

AuthPage.propTypes = {
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  hideLoginErrorsInput: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  noErrorsDescription: PropTypes.bool.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  submitSuccess: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectAuthPage();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      hideLoginErrorsInput,
      onChangeInput,
      setErrors,
      setForm,
      submit,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = strapi.injectReducer({ key: 'authPage', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'authPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(AuthPage);
