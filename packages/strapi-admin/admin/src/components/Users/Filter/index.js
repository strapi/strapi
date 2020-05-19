import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Option } from '@buffetjs/core';
import Text from './Text';

const Filter = ({ displayName, filter, name, onClick, value }) => {
  const { formatMessage } = useIntl();
  const label = (
    <>
      <Text>{displayName}</Text>
      <Text fontWeight="700">
        &nbsp;{formatMessage({ id: `components.FilterOptions.FILTER_TYPES.${filter}` })}&nbsp;
      </Text>
      <Text>{value}</Text>
    </>
  );

  const handleClick = () => {
    onClick({ target: { name, value } });
  };

  return <Option label={label} margin="0 10px 6px 0" onClick={handleClick} />;
};

Filter.defaultProps = {
  onClick: () => {},
};

Filter.propTypes = {
  filter: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  value: PropTypes.string.isRequired,
};

export default Filter;
