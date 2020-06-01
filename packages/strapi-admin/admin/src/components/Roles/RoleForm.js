import React from 'react';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';
import NameInput from 'ee_else_ce/components/Roles/NameInput';

import FormCard from '../FormBloc';
import SizedInput from '../SizedInput';
import ButtonWithNumber from './ButtonWithNumber';

const RoleForm = ({ values, errors, onChange, onBlur, isLoading }) => {
  const { formatMessage } = useIntl();

  const actions = [
    <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')} key="user-button">
      {formatMessage({
        id: 'Settings.roles.form.button.users-with-role',
      })}
    </ButtonWithNumber>,
  ];

  return (
    <FormCard
      actions={actions}
      isLoading={isLoading}
      title={formatMessage({
        id: 'Settings.roles.form.title',
      })}
      subtitle={formatMessage({
        id: 'Settings.roles.form.description',
      })}
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
  values: { name: '', description: '' },
};
RoleForm.propTypes = {
  values: PropTypes.object,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default RoleForm;
