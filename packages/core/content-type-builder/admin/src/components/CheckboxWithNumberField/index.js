/**
 *
 * CheckboxWithNumberField
 *
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Stack } from '@strapi/design-system/Stack';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { TextInput } from '@strapi/design-system/TextInput';

const CheckboxWithNumberField = ({ error, intlLabel, modifiedData, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const [showInput, setShowInput] = useState(!!value);
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const type = modifiedData.type === 'biginteger' ? 'text' : 'number';

  const disabled = !modifiedData.type;
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <Stack size={2}>
      <Checkbox
        id={name}
        name={name}
        onValueChange={value => {
          onChange({ target: { name, value: value ? 1 : null } });
          setShowInput(prev => !prev);
        }}
        value={Boolean(value)}
      >
        {label}
      </Checkbox>
      {showInput && (
        <Box paddingLeft={6} style={{ maxWidth: '200px' }}>
          {type === 'text' ? (
            <TextInput
              aria-label={label}
              disabled={disabled}
              error={errorMessage}
              id={name}
              name={name}
              onChange={onChange}
              value={typeof value === 'boolean' ? '1' : value}
            />
          ) : (
            <NumberInput
              aria-label={label}
              disabled={disabled}
              error={errorMessage}
              id={name}
              name={name}
              onValueChange={value => {
                onChange({ target: { name, value, type } });
              }}
              value={typeof value === 'boolean' ? 0 : value}
            />
          )}
        </Box>
      )}
    </Stack>
  );
};

CheckboxWithNumberField.defaultProps = {
  error: null,
  value: null,
};

CheckboxWithNumberField.propTypes = {
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.bool,
    PropTypes.number,
  ]),
};

export default CheckboxWithNumberField;
