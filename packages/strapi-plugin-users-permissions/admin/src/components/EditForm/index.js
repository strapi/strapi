/**
 *
 * EditForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import { InputsIndex as Input, LoadingIndicator } from 'strapi-helper-plugin';

import { Separator, Wrapper } from './Components';

class EditForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  generateSelectOptions = () =>
    Object.keys(get(this.props.values, 'roles', [])).reduce((acc, current) => {
      const option = {
        id: get(this.props.values.roles, [current, 'name']),
        value: get(this.props.values.roles, [current, 'type']),
      };
      acc.push(option);
      return acc;
    }, []);

  render() {
    const { onChange, showLoaders } = this.props;

    return (
      <Wrapper className={showLoaders && 'load-container'}>
        {showLoaders ? (
          <LoadingIndicator />
        ) : (
          <div>
            <div className="row">
              <Input
                inputDescription={{
                  id: 'users-permissions.EditForm.inputSelect.description.role',
                }}
                label={{
                  id: 'users-permissions.EditForm.inputSelect.label.role',
                }}
                name="advanced.settings.default_role"
                onChange={onChange}
                selectOptions={this.generateSelectOptions()}
                type="select"
                value={get(this.props.values.settings, 'default_role')}
              />
            </div>
            <Separator />
            <div className="row">
              <Input
                label={{
                  id: 'users-permissions.EditForm.inputToggle.label.email',
                }}
                inputDescription={{
                  id:
                    'users-permissions.EditForm.inputToggle.description.email',
                }}
                name="advanced.settings.unique_email"
                onChange={onChange}
                type="toggle"
                value={get(this.props.values.settings, 'unique_email')}
              />
            </div>
            <Separator />

            <div className="row">
              <Input
                label={{
                  id: 'users-permissions.EditForm.inputToggle.label.sign-up',
                }}
                inputDescription={{
                  id:
                    'users-permissions.EditForm.inputToggle.description.sign-up',
                }}
                name="advanced.settings.allow_register"
                onChange={onChange}
                type="toggle"
                value={get(this.props.values.settings, 'allow_register')}
              />
            </div>
            <Separator />
            <div className="row">
              <Input
                label={{
                  id:
                    'users-permissions.EditForm.inputToggle.label.email-confirmation',
                }}
                inputDescription={{
                  id:
                    'users-permissions.EditForm.inputToggle.description.email-confirmation',
                }}
                name="advanced.settings.email_confirmation"
                onChange={onChange}
                type="toggle"
                value={get(this.props.values.settings, 'email_confirmation')}
              />
            </div>
            <div className="row">
              <Input
                label={{
                  id:
                    'users-permissions.EditForm.inputToggle.label.email-confirmation-redirection',
                }}
                inputDescription={{
                  id:
                    'users-permissions.EditForm.inputToggle.description.email-confirmation-redirection',
                }}
                name="advanced.settings.email_confirmation_redirection"
                onChange={onChange}
                type="text"
                value={get(
                  this.props.values.settings,
                  'email_confirmation_redirection'
                )}
              />
            </div>
          </div>
        )}
      </Wrapper>
    );
  }
}

EditForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  showLoaders: PropTypes.bool.isRequired,
  values: PropTypes.object.isRequired,
};

export default EditForm;
