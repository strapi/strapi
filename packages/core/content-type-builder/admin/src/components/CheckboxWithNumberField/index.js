/**
 *
 * CheckboxWithNumberField
 *
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Checkbox } from '@strapi/parts/Checkbox';
import { Stack } from '@strapi/parts/Stack';
import { NumberInput } from '@strapi/parts/NumberInput';
import { getTrad } from '../../utils';

const CheckboxWithNumberField = ({ intlLabel, modifiedData, name, onChange, value }) => {
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

  return (
    <Stack size={2}>
      <Checkbox
        id={name}
        name={name}
        onValueChange={value => {
          onChange({ target: { name, value: value || null } });
          setShowInput(prev => !prev);
        }}
        value={Boolean(value)}
      >
        {label}
      </Checkbox>
      {showInput && (
        <NumberInput
          aria-label={label}
          disabled={disabled}
          id={name}
          name={name}
          onValueChange={value => {
            onChange({ target: { name, value, type } });
          }}
          value={value || undefined}
        />
      )}
    </Stack>
  );
};

CheckboxWithNumberField.defaultProps = {
  value: null,
};

CheckboxWithNumberField.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
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
