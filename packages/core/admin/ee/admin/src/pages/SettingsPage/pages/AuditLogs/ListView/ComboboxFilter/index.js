import React from 'react';

import { Combobox, ComboboxOption } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const ComboboxFilter = ({ value, options, onChange }) => {
  const { formatMessage } = useIntl();
  const ariaLabel = formatMessage({
    id: 'Settings.permissions.auditLogs.filter.aria-label',
    defaultMessage: 'Search and select an option to filter',
  });

  return (
    <Combobox aria-label={ariaLabel} value={value} onChange={onChange}>
      {options.map(({ label, customValue }) => {
        return (
          <ComboboxOption key={customValue} value={customValue}>
            {label}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

ComboboxFilter.defaultProps = {
  value: null,
};

ComboboxFilter.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      customValue: PropTypes.string.isRequired,
    }).isRequired
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ComboboxFilter;
