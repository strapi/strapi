/**
 *
 * EditForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import { InputsIndex as Input, LoadingIndicator } from 'strapi-helper-plugin';

import { Wrapper } from './Components';

function EditForm({ disabled, onChange, showLoaders, values }) {
  const { roles, settings } = values;

  const generateSelectOptions = () =>
    Object.keys(get(values, 'roles', [])).reduce((acc, current) => {
      const option = {
        id: get(roles, [current, 'name']),
        value: get(roles, [current, 'type']),
      };
      acc.push(option);
      return acc;
    }, []);

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
              selectOptions={generateSelectOptions()}
              type="select"
              value={get(settings, 'default_role')}
              disabled={disabled}
            />
            <div className="col-6"></div>
            <Input
              label={{
                id: 'users-permissions.EditForm.inputToggle.label.email',
              }}
              inputDescription={{
                id: 'users-permissions.EditForm.inputToggle.description.email',
              }}
              name="advanced.settings.unique_email"
              onChange={onChange}
              type="toggle"
              disabled={disabled}
              value={get(settings, 'unique_email')}
            />
            <div className="col-6"></div>
            <Input
              disabled={disabled}
              label={{
                id: 'users-permissions.EditForm.inputToggle.label.sign-up',
              }}
              inputDescription={{
                id: 'users-permissions.EditForm.inputToggle.description.sign-up',
              }}
              name="advanced.settings.allow_register"
              onChange={onChange}
              type="toggle"
              value={get(settings, 'allow_register')}
            />
            <div className="col-6"></div>
            <Input
              disabled={disabled}
              label={{
                id: 'users-permissions.EditForm.inputToggle.label.email-reset-password',
              }}
              inputDescription={{
                id: 'users-permissions.EditForm.inputToggle.description.email-reset-password',
              }}
              name="advanced.settings.email_reset_password"
              onChange={onChange}
              placeholder="ex: https://yourfrontend.com/reset-password"
              type="text"
              value={get(settings, 'email_reset_password')}
            />
            <div className="col-6"></div>
            <Input
              disabled={disabled}
              label={{
                id: 'users-permissions.EditForm.inputToggle.label.email-confirmation',
              }}
              inputDescription={{
                id: 'users-permissions.EditForm.inputToggle.description.email-confirmation',
              }}
              name="advanced.settings.email_confirmation"
              onChange={onChange}
              type="toggle"
              value={get(settings, 'email_confirmation')}
            />
            <div className="col-6"></div>
            <Input
              disabled={disabled}
              label={{
                id: 'users-permissions.EditForm.inputToggle.label.email-confirmation-redirection',
              }}
              inputDescription={{
                id:
                  'users-permissions.EditForm.inputToggle.description.email-confirmation-redirection',
              }}
              name="advanced.settings.email_confirmation_redirection"
              onChange={onChange}
              type="text"
              placeholder="ex: https://yourfrontend.com/confirmation/success"
              value={get(settings, 'email_confirmation_redirection')}
            />
          </div>
        </div>
      )}
    </Wrapper>
  );
}

EditForm.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoaders: PropTypes.bool.isRequired,
  values: PropTypes.object.isRequired,
};

export default EditForm;
