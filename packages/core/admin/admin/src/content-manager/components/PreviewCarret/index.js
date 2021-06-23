import React, { memo } from 'react';
import PropTypes from 'prop-types';

import Wrapper from './components';

const PreviewCarret = ({ isComponent, style }) => (
  <Wrapper isComponent={isComponent} style={style}>
    <div />
  </Wrapper>
);

PreviewCarret.defaultProps = {
  isComponent: false,
  style: {},
};

PreviewCarret.propTypes = {
  isComponent: PropTypes.bool,
  style: PropTypes.object,
};

export default memo(PreviewCarret);
