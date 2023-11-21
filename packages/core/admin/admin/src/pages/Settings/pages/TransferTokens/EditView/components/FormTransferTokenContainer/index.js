import React from 'react';

import { Box, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import LifeSpanInput from '../../../../../components/Tokens/LifeSpanInput';
import TokenDescription from '../../../../../components/Tokens/TokenDescription';
import TokenName from '../../../../../components/Tokens/TokenName';
import TokenTypeSelect from '../../../../../components/Tokens/TokenTypeSelect';

const FormTransferTokenContainer = ({
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  transferToken,
}) => {
  const { formatMessage } = useIntl();

  const typeOptions = [
    {
      value: 'push',
      label: {
        id: 'Settings.transferTokens.types.push',
        defaultMessage: 'Push',
      },
    },
    {
      value: 'pull',
      label: {
        id: 'Settings.transferTokens.types.pull',
        defaultMessage: 'Pull',
      },
    },
    {
      value: 'push-pull',
      label: {
        id: 'Settings.transferTokens.types.push-pull',
        defaultMessage: 'Full Access',
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
              token={transferToken}
            />
          </GridItem>
          <GridItem key="permissions" col={6} xs={12}>
            <TokenTypeSelect
              name="permissions"
              values={values}
              errors={errors}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
              onChange={(value) => {
                onChange({ target: { name: 'permissions', value } });
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

FormTransferTokenContainer.propTypes = {
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
  transferToken: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.string,
    name: PropTypes.string,
    accessKey: PropTypes.string,
    permissions: PropTypes.array,
    description: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

FormTransferTokenContainer.defaultProps = {
  errors: {},
  transferToken: {},
};

export default FormTransferTokenContainer;
