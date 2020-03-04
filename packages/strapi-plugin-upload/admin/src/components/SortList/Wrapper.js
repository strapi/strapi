import React from 'react';
import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

import Text from '../Text';

const Wrapper = styled(props => <Text as="ul" fontSize="md" {...props} />)`
  margin-bottom: 0;
  padding: 0;
  min-width: 230px;
  list-style-type: none;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  box-shadow: 0 2px 4px ${({ theme }) => theme.main.colors.greyAlpha};
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;
