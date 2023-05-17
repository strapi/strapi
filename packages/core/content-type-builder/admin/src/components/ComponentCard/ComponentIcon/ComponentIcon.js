import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

import { Flex, Icon } from '@strapi/design-system';
import * as Icons from '@strapi/icons';

const Wrapper = styled(Flex)`
  border-radius: 50%;
  height: ${({ theme }) => theme.spaces[8]};
  width: ${({ theme }) => theme.spaces[8]};

  svg {
    height: ${({ theme }) => theme.spaces[5]};
    width: ${({ theme }) => theme.spaces[5]};
  }
`;

export function ComponentIcon({ isActive, icon }) {
  return (
    <Wrapper
      alignItems="center"
      background={isActive ? 'primary200' : 'neutral200'}
      justifyContent="center"
    >
      <Icon as={Icons[icon] || Icons.Cube} />
    </Wrapper>
  );
}

ComponentIcon.defaultProps = {
  isActive: false,
  icon: 'Cube',
};

ComponentIcon.propTypes = {
  isActive: PropTypes.bool,
  icon: PropTypes.string,
};
