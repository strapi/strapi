import React from 'react';
import PropTypes from 'prop-types';
import { ClearIcon } from 'strapi-helper-plugin';

import LoadingIndicator from '../LoadingIndicator';
import IntlText from '../IntlText';
import Button from './Button';
import Container from './Container';
import Wrapper from './Wrapper';

const InfiniteLoadingIndicator = ({ onClick }) => {
  return (
    <Wrapper>
      <Container>
        <LoadingIndicator />
        <Button type="button" onClick={onClick}>
          <IntlText
            as="span"
            fontSize="xs"
            fontWeight="semiBold"
            color="grey"
            id="app.components.Button.cancel"
          />
          <ClearIcon />
        </Button>
      </Container>
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
