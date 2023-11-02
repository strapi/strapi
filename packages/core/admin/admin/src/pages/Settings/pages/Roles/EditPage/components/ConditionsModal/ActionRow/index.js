import React from 'react';

import { Box, Flex, MultiSelectNested, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getNestedOptions, getNewStateFromChangedValues, getSelectedValues } from './utils/options';

const ActionRow = ({
  arrayOfOptionsGroupedByCategory,
  isFormDisabled,
  isGrey,
  label,
  name,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();

  const handleChange = (val) => {
    onChange(name, getNewStateFromChangedValues(arrayOfOptionsGroupedByCategory, val));
  };

  return (
    <Flex as="li" background={isGrey ? 'neutral100' : 'neutral0'} paddingBottom={3} paddingTop={3}>
      <Flex paddingLeft={6} style={{ width: 180 }}>
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage({
            id: 'Settings.permissions.conditions.can',
            defaultMessage: 'Can',
          })}
          &nbsp;
        </Typography>
        <Typography variant="sigma" title={label} textColor="primary600" ellipsis>
          {formatMessage({
            id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
            defaultMessage: label,
          })}
        </Typography>
        <Typography variant="sigma" textColor="neutral600">
          &nbsp;
          {formatMessage({
            id: 'Settings.permissions.conditions.when',
            defaultMessage: 'When',
          })}
        </Typography>
      </Flex>
      <Box style={{ maxWidth: 430, width: '100%' }}>
        <MultiSelectNested
          id={name}
          customizeContent={(values) => `${values.length} currently selected`}
          onChange={handleChange}
          value={getSelectedValues(value)}
          options={getNestedOptions(arrayOfOptionsGroupedByCategory)}
          disabled={isFormDisabled}
        />
      </Box>
    </Flex>
  );
};

ActionRow.propTypes = {
  arrayOfOptionsGroupedByCategory: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  isGrey: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ActionRow;
