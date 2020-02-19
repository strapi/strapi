import React from 'react';
import PropTypes from 'prop-types';
import { ClearIcon } from 'strapi-helper-plugin';
import Button from './Button';
import Indicator from './Indicator';
import Wrapper from './Wrapper';

const InfiniteLoadingIndicator = ({ onClick }) => {
  return (
    <Wrapper>
      <Indicator />
      <Button type="button" onClick={onClick}>
        Cancel
        <ClearIcon />
      </Button>
    </Wrapper>
  );
};

InfiniteLoadingIndicator.defaultProps = {
  onClick: () => {},
};

InfiniteLoadingIndicator.propTypes = {
  onClick: PropTypes.func,
};

export default InfiniteLoadingIndicator;
