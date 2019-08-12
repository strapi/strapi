import React, { memo } from 'react';
import PropTypes from 'prop-types';

import Wrapper from './components';

const PreviewCarret = ({ isGroup }) => (
  <Wrapper isGroup={isGroup}>
    <div />
  </Wrapper>
);

PreviewCarret.defaultProps = {
  isGroup: false,
};

PreviewCarret.propTypes = {
  isGroup: PropTypes.bool,
};

export default memo(PreviewCarret);
