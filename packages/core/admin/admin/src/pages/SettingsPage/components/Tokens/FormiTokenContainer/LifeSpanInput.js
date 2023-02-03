import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { usePersistentState } from '@strapi/helper-plugin';
import { Select, Option } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import { getDateOfExpiration } from '../../../pages/ApiTokens/EditView/utils';

const LifeSpanInput = ({ token, errors, values, onChange, disabled }) => {
  console.log('token', token);
  const { formatMessage } = useIntl();
  const [lang] = usePersistentState('strapi-admin-language', 'en');

  return (
    <>
      <Select
        name="lifespan"
        label={formatMessage({
          id: 'Settings.apiTokens.form.duration',
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
        disabled={disabled}
        placeholder="Select"
      >
        <Option value="604800000">
          {formatMessage({
            id: 'Settings.apiTokens.duration.7-days',
            defaultMessage: '7 days',
          })}
        </Option>
        <Option value="2592000000">
          {formatMessage({
            id: 'Settings.apiTokens.duration.30-days',
            defaultMessage: '30 days',
          })}
        </Option>
        <Option value="7776000000">
          {formatMessage({
            id: 'Settings.apiTokens.duration.90-days',
            defaultMessage: '90 days',
          })}
        </Option>
        <Option value="0">
          {formatMessage({
            id: 'Settings.apiTokens.duration.unlimited',
            defaultMessage: 'Unlimited',
          })}
        </Option>
      </Select>
      <Typography variant="pi" textColor="neutral600">
        {disabled &&
          `${formatMessage({
            id: 'Settings.apiTokens.duration.expiration-date',
            defaultMessage: 'Expiration date',
          })}: ${getDateOfExpiration(token?.createdAt, parseInt(values.lifespan, 10, lang))}`}
      </Typography>
    </>
  );
};

LifeSpanInput.propTypes = {
  errors: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  values: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  disabled: PropTypes.bool.isRequired,
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
