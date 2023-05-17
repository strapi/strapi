import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

import { Flex, Icon } from '@strapi/design-system';
import * as Icons from '@strapi/icons';

const WIDTH_S = 5;
const WIDTH_M = 8;

const Wrapper = styled(Flex)`
  border-radius: ${({ showBackground }) => (showBackground ? `50%` : 0)};
  color: ${({ theme }) => theme.colors.neutral600};
  height: ${({ theme, size }) => theme.spaces[size === 'S' ? WIDTH_S : WIDTH_M]};
  width: ${({ theme, size }) => theme.spaces[size === 'S' ? WIDTH_S : WIDTH_M]};

  svg {
    height: ${({ theme, size }) => theme.spaces[size === 'S' ? WIDTH_S - 2 : WIDTH_M - 3]};
    width: ${({ theme, size }) => theme.spaces[size === 'S' ? WIDTH_S - 2 : WIDTH_M - 3]};
  }
`;

export function ComponentIcon({ showBackground = true, size = 'M', icon }) {
  return (
    <Wrapper
      alignItems="center"
      background={showBackground ? 'neutral200' : null}
      justifyContent="center"
      size={size}
      showBackground={showBackground}
    >
      <Icon as={Icons[icon] || Icons.Cube} />
    </Wrapper>
  );
}

ComponentIcon.defaultProps = {
  showBackground: true,
  size: 'M',
  icon: 'Cube',
};

ComponentIcon.propTypes = {
  showBackground: PropTypes.bool,
  size: PropTypes.string,
  icon: PropTypes.string,
};
