import React, { memo } from 'react';
import PropTypes from 'prop-types';

import Wrapper from './components';

const PreviewCarret = ({ isGroup, style }) => (
  <Wrapper isGroup={isGroup} style={style}>
    <div />
  </Wrapper>
);

PreviewCarret.defaultProps = {
  isGroup: false,
  style: {},
};

PreviewCarret.propTypes = {
  isGroup: PropTypes.bool,
  style: PropTypes.object,
};

export default memo(PreviewCarret);
