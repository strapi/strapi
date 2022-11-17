import React from 'react';
import PropTypes from 'prop-types';
import { ContentLayout } from '@strapi/design-system/Layout';
import { Stack } from '@strapi/design-system/Stack';
import HeaderContentBox from '../ContentBox';
import FormApiTokenContainer from '../FormApiTokenContainer';
import Permissions from '../Permissions';

const FormBody = ({
  apiToken,
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  onDispatch,
  setHasChangedPermissions,
}) => {
  return (
    <ContentLayout>
      <Stack spacing={6}>
        {Boolean(apiToken?.name) && <HeaderContentBox apiToken={apiToken?.accessKey} />}
        <FormApiTokenContainer
          errors={errors}
          onChange={onChange}
          canEditInputs={canEditInputs}
          isCreating={isCreating}
          values={values}
          apiToken={apiToken}
          onDispatch={onDispatch}
          setHasChangedPermissions={setHasChangedPermissions}
        />
        <Permissions
          disabled={
            !canEditInputs || values?.type === 'read-only' || values?.type === 'full-access'
          }
        />
      </Stack>
    </ContentLayout>
  );
};

FormBody.propTypes = {
  errors: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.string,
    type: PropTypes.string,
  }),
  apiToken: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.string,
    name: PropTypes.string,
    accessKey: PropTypes.string,
    permissions: PropTypes.array,
    description: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  isCreating: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  onDispatch: PropTypes.func.isRequired,
  setHasChangedPermissions: PropTypes.func.isRequired,
};

FormBody.defaultProps = {
  errors: {},
  apiToken: {},
};

export default FormBody;
