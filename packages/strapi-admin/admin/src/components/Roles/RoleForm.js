import React from 'react';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';
import NameInput from 'ee_else_ce/components/Roles/NameInput';

import FormCard from '../FormBloc';
import SizedInput from '../SizedInput';
import ButtonWithNumber from './ButtonWithNumber';

const RoleForm = ({ role, values, errors, onChange, onBlur, isLoading }) => {
  const { formatMessage } = useIntl();

  const actions = [
    <ButtonWithNumber
      number={role.usersCount}
      onClick={() => console.log('Open user modal')}
      key="user-button"
    >
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
      })}
    </ButtonWithNumber>,
  ];

  return (
    <FormCard
      actions={actions}
      isLoading={isLoading}
      title={
        role
          ? role.name
          : formatMessage({
            id: 'Settings.roles.form.title',
          })
      }
      subtitle={
        role
          ? role.description
          : formatMessage({
            id: 'Settings.roles.form.description',
          })
      }
    >
      <NameInput
        label={formatMessage({
          id: 'Settings.roles.form.input.name',
        })}
        name="name"
        type="text"
        error={errors.name ? { id: errors.name } : null}
        onBlur={onBlur}
        value={values.name}
        onChange={onChange}
      />

      <SizedInput
        label={formatMessage({
          id: 'Settings.roles.form.input.description',
        })}
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
  isLoading: false,
  role: null,
  values: { name: '', description: '' },
};
RoleForm.propTypes = {
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  role: PropTypes.object,
  values: PropTypes.object,
};

export default RoleForm;
