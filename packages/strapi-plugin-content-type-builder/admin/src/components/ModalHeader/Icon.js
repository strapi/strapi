import React from 'react';
import { AttributeIcon } from '@buffetjs/core';
import PropTypes from 'prop-types';

const Icon = ({ type }) => {
  const icoName = type === 'collectionType' ? 'contentType' : type;

  return <AttributeIcon type={icoName || 'dynamiczone'} style={{ margin: 'auto 20px auto 0' }} />;
};

Icon.defaultProps = {
  type: 'dynamiczone',
};

Icon.propTypes = {
  type: PropTypes.string,
};

export default Icon;
