import React, { memo } from 'react';
import PropTypes from 'prop-types';

import FieldItem from '../FieldItem';

const Item = ({ name, size, type }) => {
  return <FieldItem name={name} size={size} type={type} />;
};

Item.defaultProps = {
  type: 'string',
};

Item.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  type: PropTypes.string,
};

export default memo(Item);
