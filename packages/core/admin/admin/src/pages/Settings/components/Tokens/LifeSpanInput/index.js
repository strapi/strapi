import React from 'react';

import { Option, Select, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getDateOfExpiration } from '../../../pages/ApiTokens/EditView/utils';

const LifeSpanInput = ({ token, errors, values, onChange, isCreating }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Select
        name="lifespan"
        label={formatMessage({
          id: 'Settings.tokens.form.duration',
          defaultMessage: 'Token duration',
        })}
        value={values.lifespan !== null ? values.lifespan : '0'}
        error={
          errors.lifespan
            ? formatMessage(
                errors.lifespan?.id
                  ? errors.lifespan
                  : { id: errors.lifespan, defaultMessage: errors.lifespan }
              )
            : null
        }
        onChange={(value) => {
          onChange({ target: { name: 'lifespan', value } });
        }}
        required
        disabled={!isCreating}
        placeholder="Select"
      >
        <Option value="604800000">
          {formatMessage({
            id: 'Settings.tokens.duration.7-days',
            defaultMessage: '7 days',
          })}
        </Option>
        <Option value="2592000000">
          {formatMessage({
            id: 'Settings.tokens.duration.30-days',
            defaultMessage: '30 days',
          })}
        </Option>
        <Option value="7776000000">
          {formatMessage({
            id: 'Settings.tokens.duration.90-days',
            defaultMessage: '90 days',
          })}
        </Option>
        <Option value="0">
          {formatMessage({
            id: 'Settings.tokens.duration.unlimited',
            defaultMessage: 'Unlimited',
          })}
        </Option>
      </Select>
      <Typography variant="pi" textColor="neutral600">
        {!isCreating &&
          `${formatMessage({
            id: 'Settings.tokens.duration.expiration-date',
            defaultMessage: 'Expiration date',
          })}: ${getDateOfExpiration(token?.createdAt, parseInt(values.lifespan, 10))}`}
      </Typography>
    </>
  );
};

LifeSpanInput.propTypes = {
  errors: PropTypes.shape({
    lifespan: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  values: PropTypes.shape({
    lifespan: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  isCreating: PropTypes.bool.isRequired,
  token: PropTypes.shape({
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

LifeSpanInput.defaultProps = {
  errors: {},
  token: {},
};

export default LifeSpanInput;
