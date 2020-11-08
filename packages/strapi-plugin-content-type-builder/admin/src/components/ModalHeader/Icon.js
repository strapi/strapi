import React from 'react';
import { AttributeIcon } from '@buffetjs/core';
import PropTypes from 'prop-types';

const Icon = ({ type, style }) => {
  const icoName = type === 'collectionType' ? 'contentType' : type;

  return (
    <AttributeIcon
      type={icoName || 'dynamiczone'}
      style={{ ...style, margin: 'auto 20px auto 0' }}
    />
  );
};

Icon.defaultProps = {
  style: null,
  type: 'dynamiczone',
};

Icon.propTypes = {
  style: PropTypes.object,
  type: PropTypes.string,
};

export default Icon;
