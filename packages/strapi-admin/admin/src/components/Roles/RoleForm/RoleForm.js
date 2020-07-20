import React from 'react';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';

import NameInput from './NameInput';

import FormCard from '../../FormBloc';
import SizedInput from '../../SizedInput';
import ButtonWithNumber from '../ButtonWithNumber';

const RoleForm = ({ disabled, role, values, errors, onChange, onBlur, isLoading }) => {
  const { formatMessage } = useIntl();

  const actions = [
    <ButtonWithNumber
      number={role.usersCount}
      onClick={() => console.log('Open user modal')}
      key="user-button"
    >
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
        defaultMessage: 'Users with this role',
      })}
    </ButtonWithNumber>,
  ];

  return (
    <FormCard
      actions={actions}
      isLoading={isLoading}
      title={
        /* eslint-disable indent */
        role
          ? role.name
          : formatMessage({
              id: 'Settings.roles.form.title',
              defaultMessage: 'Details',
            })
      }
      subtitle={
        role
          ? role.description
          : formatMessage({
              id: 'Settings.roles.form.description',
              defaultMessage: 'Name and description of the role',
            })
      }
      /* eslint-enable indent */
    >
      <NameInput
        disabled={disabled}
        label="Settings.roles.form.input.name"
        defaultMessage="Name"
        name="name"
        type="text"
        error={errors.name ? { id: errors.name } : null}
        onBlur={onBlur}
        value={values.name}
        onChange={onChange}
      />

      <SizedInput
        disabled={disabled}
        label="Settings.roles.form.input.description"
        defaultMessage="Description"
        name="description"
        type="textarea"
        onBlur={onBlur}
        value={values.description}
        onChange={onChange}
        // Override the default height of the textarea
        style={{ height: 115 }}
      />
    </FormCard>
  );
};

RoleForm.defaultProps = {
  disabled: false,
  isLoading: false,
  role: null,
  values: { name: '', description: '' },
};
RoleForm.propTypes = {
  disabled: PropTypes.bool,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  role: PropTypes.object,
  values: PropTypes.object,
};

export default RoleForm;
