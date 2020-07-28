import React from 'react';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';

import SizedInput from '../../../../../admin/src/components/SizedInput';
import { ButtonWithNumber } from '../../../../../admin/src/components/Roles';
import FormCard from '../../../../../admin/src/components/FormBloc';

const RoleForm = ({ values, errors, onChange, onBlur, isLoading }) => {
  const { formatMessage } = useIntl();

  const actions = [
    <ButtonWithNumber number={0} onClick={() => console.log('Open user modal')} key="user-button">
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
      title={formatMessage({
        id: 'Settings.roles.form.title',
        defaultMessage: 'Details',
      })}
      subtitle={formatMessage({
        id: 'Settings.roles.form.description',
        defaultMessage: 'Name and description of the role',
      })}
    >
      <SizedInput
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
