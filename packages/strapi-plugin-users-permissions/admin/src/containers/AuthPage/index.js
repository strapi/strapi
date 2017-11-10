/**
 *
 * AuthPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { findIndex, get, isBoolean, isEmpty, map } from 'lodash';
import cn from 'classnames';
// Design
import Button from 'components/Button';
import Input from 'components/Input';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

import {
  onChangeInput,
  setErrors,
  setForm,
} from './actions';
import form from './form.json';
import reducer from './reducer';
import saga from './saga';
import makeSelectAuthPage from './selectors';

import styles from './styles.scss';

export class AuthPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.setForm(this.props.match.params.authType, this.props.match.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.match.params.authType !== nextProps.match.params.authType) {
      this.props.setForm(nextProps.match.params.authType, nextProps.match.params.authType);
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
  }

  renderButton = () => {
    if (this.props.match.params.authType === 'login') {
      return (
        <div className={cn('col-md-6', styles.loginButton)}>
          <Button primary label="users-permissions.Auth.form.button.login" type="submit" />
        </div>
      );
    }

    return (
      <div className={cn('col-md-12', styles.buttonContainer)}>
        <Button
          label={`users-permissions.Auth.form.button.${this.props.match.params.authType}`}
          secondary={this.props.match.params.authType !== 'register'}
          style={{ width: '100%' }}
          primary={this.props.match.params.authType === 'register'}
          type="submit"
        />
      </div>
    );
  }

  render() {
    const borderTop = this.props.match.params.authType === 'login' || this.props.match.params.authType === 'register' ? { borderTop: '2px solid #1C5DE7'} : { borderTop: '2px solid #F64D0A'};
    const inputs = get(form, ['form', this.props.match.params.authType]);
    
    return (
      <div className={styles.authPage}>
        <div className={styles.wrapper}>
          {/* TODO Handle header */}
          <span>strapi</span>
          <div className={styles.formContainer} style={borderTop}>
            <form onSubmit={this.handleSubmit}>
              <div className="container-fluid">
                <div className="row" style={{ textAlign: 'start' }}>
                  {map(inputs, (input, key) => (
                    <Input
                      autoFocus={key === 0}
                      customBootstrapClass={get(input, 'customBootstrapClass')}
                      didCheckErrors={this.props.didCheckErrors}
                      errors={get(this.props.formErrors, [findIndex(this.props.formErrors, ['name', input.name]), 'errors'])}
                      key={get(input, 'name')}
                      label={get(input, 'label')}
                      name={get(input, 'name')}
                      onChange={this.props.onChangeInput}
                      placeholder={get(input, 'placeholder')}
                      type={get(input, 'type')}
                      validations={{ required: true }}
                      value={get(this.props.modifiedData, get(input, 'name'))}
                    />
                  ))}
                  {this.renderButton()}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

AuthPage.propTypes = {
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectAuthPage();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onChangeInput,
      setErrors,
      setForm,
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
