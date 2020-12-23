import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex, Padded, Text } from '@buffetjs/core';

const BorderTop = styled.div`
  border-top: 1px solid ${({ theme }) => theme.main.colors.border};
  width: 100%;
`;

// TODO : replace by the buffet component when it is released
const Separator = ({ label }) => {
  return label ? (
    <Flex justifyContent="center" alignItems="center">
      <BorderTop />
      <Padded left right size="sm">
        <Text color="grey">{label}</Text>
      </Padded>
      <BorderTop />
    </Flex>
  ) : (
    <BorderTop />
  );
};

Separator.defaultProps = {
  label: null,
};
Separator.propTypes = {
  label: PropTypes.string,
};

export default Separator;
