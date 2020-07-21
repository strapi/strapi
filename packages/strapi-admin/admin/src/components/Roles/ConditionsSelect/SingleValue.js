/* eslint-disable indent */
import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

const Value = ({ children, selectProps, ...props }) => {
  const { formatMessage } = useIntl();
  const SingleValue = components.SingleValue;

  return (
    <SingleValue {...props}>
      <Text style={{ paddingTop: 1 }}>
        {selectProps.value.length === 0
          ? 'Anytime'
          : formatMessage(
              {
                id: `Settings.permissions.conditions.selected.${
                  selectProps.value.length > 1 ? 'plural' : 'singular'
                }`,
              },
              { number: selectProps.value.length }
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
    value: PropTypes.array,
  }),
};

export default Value;
