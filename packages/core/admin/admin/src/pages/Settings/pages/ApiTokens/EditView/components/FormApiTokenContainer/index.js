import React from 'react';

import { Box, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import LifeSpanInput from '../../../../../components/Tokens/LifeSpanInput';
import TokenDescription from '../../../../../components/Tokens/TokenDescription';
import TokenName from '../../../../../components/Tokens/TokenName';
import TokenTypeSelect from '../../../../../components/Tokens/TokenTypeSelect';

const FormApiTokenContainer = ({
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  apiToken,
  onDispatch,
  setHasChangedPermissions,
}) => {
  const { formatMessage } = useIntl();

  const handleChangeSelectApiTokenType = ({ target: { value } }) => {
    setHasChangedPermissions(false);

    if (value === 'full-access') {
      onDispatch({
        type: 'SELECT_ALL_ACTIONS',
      });
    }
    if (value === 'read-only') {
      onDispatch({
        type: 'ON_CHANGE_READ_ONLY',
      });
    }
  };

  const typeOptions = [
    {
      value: 'read-only',
      label: {
        id: 'Settings.tokens.types.read-only',
        defaultMessage: 'Read-only',
      },
    },
    {
      value: 'full-access',
      label: {
        id: 'Settings.tokens.types.full-access',
        defaultMessage: 'Full access',
      },
    },
    {
      value: 'custom',
      label: {
        id: 'Settings.tokens.types.custom',
        defaultMessage: 'Custom',
      },
    },
  ];

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem key="name" col={6} xs={12}>
            <TokenName
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="description" col={6} xs={12}>
            <TokenDescription
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="lifespan" col={6} xs={12}>
            <LifeSpanInput
              isCreating={isCreating}
              errors={errors}
              values={values}
              onChange={onChange}
              token={apiToken}
            />
          </GridItem>

          <GridItem key="type" col={6} xs={12}>
            <TokenTypeSelect
              values={values}
              errors={errors}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
              onChange={(value) => {
                handleChangeSelectApiTokenType({ target: { value } });
                onChange({ target: { name: 'type', value } });
              }}
              options={typeOptions}
              canEditInputs={canEditInputs}
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

FormApiTokenContainer.propTypes = {
  errors: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.string,
    type: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
  }).isRequired,
  isCreating: PropTypes.bool.isRequired,
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
  onDispatch: PropTypes.func.isRequired,
  setHasChangedPermissions: PropTypes.func.isRequired,
};

FormApiTokenContainer.defaultProps = {
  errors: {},
  apiToken: {},
};

export default FormApiTokenContainer;
