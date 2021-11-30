/**
 *
 * BooleanDefaultValueSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Select, Option } from '@strapi/design-system/Select';

const BooleanDefaultValueSelect = ({ intlLabel, name, options, onChange, value }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const handleChange = value => {
    let nextValue = '';

    if (value === 'true') {
      nextValue = true;
    }

    if (value === 'false') {
      nextValue = false;
    }

    onChange({ target: { name, value: nextValue, type: 'select-default-boolean' } });
  };

  return (
    <Select
      label={label}
      id={name}
      name={name}
      onChange={handleChange}
      value={(value === null ? '' : value).toString()}
    >
      {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
        return (
          <Option key={key} value={value} disabled={disabled} hidden={hidden}>
            {/* No need to translate the options */}
            {intlLabel.defaultMessage}
          </Option>
        );
      })}
    </Select>
  );
};

BooleanDefaultValueSelect.defaultProps = {
  value: null,
};

BooleanDefaultValueSelect.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      metadatas: PropTypes.shape({
        intlLabel: PropTypes.shape({
          id: PropTypes.string.isRequired,
          defaultMessage: PropTypes.string.isRequired,
        }).isRequired,
        disabled: PropTypes.bool,
        hidden: PropTypes.bool,
      }).isRequired,
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired
  ).isRequired,
  value: PropTypes.any,
};

export default BooleanDefaultValueSelect;
