import React from 'react';
import PropTypes from 'prop-types';

import Text from '../../Text';
import Wrapper from './Wrapper';

const Count = ({ count }) => (
  <Wrapper justifyContent="center" alignItems="center">
    <Text fontWeight="bold" color="grey" fontSize="xs">
      {count}
    </Text>
  </Wrapper>
);

Count.propTypes = {
  count: PropTypes.number,
};

Count.defaultProps = {
  count: 0,
};

export default Count;
