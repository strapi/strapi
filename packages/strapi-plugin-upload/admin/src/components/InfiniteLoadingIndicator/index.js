import React from 'react';
import { ClearIcon } from 'strapi-helper-plugin';
import Button from './Button';
import Indicator from './Indicator';
import Wrapper from './Wrapper';

const InfiniteLoadingIndicator = () => {
  return (
    <Wrapper>
      <Indicator />
      <Button type="button">
        Cancel
        <ClearIcon />
      </Button>
    </Wrapper>
  );
};

export default InfiniteLoadingIndicator;
