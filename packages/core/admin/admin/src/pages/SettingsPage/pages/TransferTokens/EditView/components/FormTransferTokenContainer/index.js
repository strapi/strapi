import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box, Grid, GridItem, Flex, Typography } from '@strapi/design-system';
import LifeSpanInput from '../../../../../components/Tokens/LifeSpanInput';
import TokenName from '../../../../../components/Tokens/TokenName';
import TokenDescription from '../../../../../components/Tokens/TokenDescription';

const FormTransferTokenContainer = ({
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  transferToken,
}) => {
  const { formatMessage } = useIntl();

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
