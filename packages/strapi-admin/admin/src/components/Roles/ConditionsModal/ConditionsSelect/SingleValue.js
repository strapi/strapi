/* eslint-disable indent */
import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { createArrayOfValues } from '../../utils';

const Value = ({ children, selectProps, ...props }) => {
  const { formatMessage } = useIntl();
  const SingleValue = components.SingleValue;
  const valuesArray = createArrayOfValues(selectProps.value).filter(val => val);

  return (
    <SingleValue {...props}>
      <Text style={{ paddingTop: 1 }}>
        {valuesArray.length === 0
          ? formatMessage({ id: 'Settings.permissions.conditions.none-selected' })
          : formatMessage(
              {
                id: `Settings.permissions.conditions.selected.${
                  selectProps.value.length > 1 ? 'plural' : 'singular'
                }`,
              },
              { number: valuesArray.length }
            )}
      </Text>
    </SingleValue>
  );
};

Value.defaultProps = {
  children: null,
  selectProps: {
    value: [],
  },
};

Value.propTypes = {
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  selectProps: PropTypes.shape({
    value: PropTypes.object,
  }),
};

export default Value;
