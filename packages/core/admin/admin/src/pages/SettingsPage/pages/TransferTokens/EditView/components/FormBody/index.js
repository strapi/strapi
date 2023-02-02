import React from 'react';
import PropTypes from 'prop-types';
import { ContentLayout } from '@strapi/design-system/Layout';
import { Stack } from '@strapi/design-system/Stack';
import HeaderContentBox from '../ContentBox';
import FormTransferTokenContainer from '../FormTransferTokenContainer';

const FormBody = ({ transferToken, errors, onChange, canEditInputs, isCreating, values }) => {
  return (
    <ContentLayout>
      <Stack spacing={6}>
        {Boolean(transferToken?.name) && (
          <HeaderContentBox transferToken={transferToken?.accessKey} />
        )}
        <FormTransferTokenContainer
          errors={errors}
          onChange={onChange}
          canEditInputs={canEditInputs}
          isCreating={isCreating}
          values={values}
          transferToken={transferToken}
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
  transferToken: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
};

FormBody.defaultProps = {
  errors: {},
  transferToken: {},
};

export default FormBody;
