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

// Logo
import LogoStrapi from 'assets/images/logo_strapi.png';

// Design
import Button from 'components/Button';
import Input from 'components/Input';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

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
    const params = this.props.location.search ? replace(this.props.location.search, '?code=', '') : this.props.match.params.id;
    this.props.setForm(this.props.match.params.authType, params);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.match.params.authType !== nextProps.match.params.authType) {
      const params = nextProps.location.search ? replace(nextProps.location.search, '?code=', '') : nextProps.match.params.id;
      this.props.setForm(nextProps.match.params.authType, params);
      this.props.hideLoginErrorsInput(false);
    }

    if (nextProps.submitSuccess) {
      switch (this.props.match.params.authType) {
        case 'login':
        case 'reset-password':
          this.props.history.push('/');
          break;
        case 'register':
          this.props.history.push('/');
          // NOTE: prepare for comfirm email;
          // this.props.history.push(`/plugins/users-permissions/auth/register-success/${this.props.modifiedData.email}`);
          break;
        default:

      }
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const formErrors = Object.keys(this.props.modifiedData).reduce((acc, key) => {
      if (isEmpty(get(this.props.modifiedData, key)) && !isBoolean(get(this.props.modifiedData, key))) {
        acc.push({ name: key, errors: [{ id: 'components.Input.error.validation.required' }] });
      }

      if (!isEmpty(get(this.props.modifiedData, 'password')) && !isEmpty(get(this.props.modifiedData, 'confirmPassword')) && findIndex(acc, ['name', 'confirmPassword']) === -1) {
        if (get(this.props.modifiedData, 'password') !== get(this.props.modifiedData, 'confirmPassword')) {
          acc.push({ name: 'confirmPassword', errors: [{ id: 'users-permissions.components.Input.error.password.noMatch' }] });
        }
      }

      return acc;
    }, []);

    this.props.setErrors(formErrors);

    if (isEmpty(formErrors)) {
      this.props.submit(this.context);
    }
  }

  renderButton = () => {
    if (this.props.match.params.authType === 'login') {
      return (
        <div className={cn('col-md-6', styles.loginButton)}>
          <Button primary label="users-permissions.Auth.form.button.login" type="submit" />
        </div>
      );
    }
    const label = this.props.match.params.authType === 'forgot-password' && this.props.submitSuccess ? 'users-permissions.Auth.form.button.forgot-password.success' : `users-permissions.Auth.form.button.${this.props.match.params.authType}`;
    return (
      <div className={cn('col-md-12', styles.buttonContainer)}>
        <Button
          label={label}
          style={{ width: '100%' }}
          primary
          type="submit"
        />
      </div>
    );
  }

  renderLink = () => {

    if (this.props.match.params.authType === 'login') {
      return (
        <Link to="/plugins/users-permissions/auth/forgot-password">
          <FormattedMessage id="users-permissions.Auth.link.forgot-password" />
        </Link>
      );
    }

    if (this.props.match.params.authType === 'forgot-password' || this.props.match.params.authType === 'register-success') {
      return (
        <Link to="/plugins/users-permissions/auth/login">
          <FormattedMessage id="users-permissions.Auth.link.ready" />
        </Link>
      );
    }

    return <div />;
  }

  render() {
    const inputs = get(form, ['form', this.props.match.params.authType]);
    const divStyle = this.props.match.params.authType === 'register' ? { marginTop: '3.2rem' } : { marginTop: '.9rem' };
    const withLogo = this.props.match.params.authType === 'register' ? (
      <div className={styles.logoContainer}><img src={LogoStrapi} alt="logo" /></div>
    ) : '';
    const headerDescription = this.props.match.params.authType === 'register' ?
      <FormattedMessage id="users-permissions.Auth.header.register.description" />
      : <span />;
    
    return (
      <div className={styles.authPage}>
        <div className={styles.wrapper}>
          <div className={styles.headerContainer}>
            {this.props.match.params.authType === 'register' ? (
              <FormattedMessage id="users-permissions.Auth.form.header.register" />
            ) : (
              <img src={LogoStrapi} alt="logo" />
            )}
          </div>
          <div className={styles.headerDescription}>
            {headerDescription}
          </div>

          <div className={styles.formContainer} style={divStyle}>
            <form onSubmit={this.handleSubmit}>
              <div className="container-fluid">
                {this.props.noErrorsDescription && !isEmpty(get(this.props.formErrors, ['0', 'errors', '0', 'id']))? (
                  <div className={styles.errorsContainer}>
                    <FormattedMessage id={get(this.props.formErrors, ['0', 'errors', '0', 'id'])} />
                  </div>
                ): ''}
                <div className="row" style={{ textAlign: 'start' }}>
                  {map(inputs, (input, key) => (
                    <Input
                      autoFocus={key === 0}
                      customBootstrapClass={get(input, 'customBootstrapClass')}
                      didCheckErrors={this.props.didCheckErrors}
                      errors={get(this.props.formErrors, [findIndex(this.props.formErrors, ['name', input.name]), 'errors'])}
                      key={get(input, 'name')}
                      label={this.props.match.params.authType === 'forgot-password' && this.props.submitSuccess? 'users-permissions.Auth.form.forgot-password.email.label.success' : get(input, 'label')}
                      name={get(input, 'name')}
                      onChange={this.props.onChangeInput}
                      placeholder={get(input, 'placeholder')}
                      type={get(input, 'type')}
                      validations={{ required: true }}
                      value={get(this.props.modifiedData, get(input, 'name'))}
                      noErrorsDescription={this.props.noErrorsDescription}
                    />
                  ))}
                  {this.renderButton()}
                </div>
              </div>
            </form>
          </div>
          <div className={styles.linkContainer}>
            {this.renderLink()}
          </div>
        </div>
        {withLogo}
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

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'authPage', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'authPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(AuthPage);
