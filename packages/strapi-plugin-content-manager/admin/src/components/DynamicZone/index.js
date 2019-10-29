import React, { memo } from 'react';
import PropTypes from 'prop-types';

const DynamicZone = ({ name }) => {
  return <div>{name}</div>;
};

DynamicZone.propTypes = {
  name: PropTypes.string.isRequired,
};

export { DynamicZone };
export default memo(DynamicZone);
