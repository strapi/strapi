import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

import { Flex, Icon } from '@strapi/design-system';
import { Cube } from '@strapi/icons';
import COMPONENT_ICONS from '../../../utils/componentIcons';

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
      <Icon as={COMPONENT_ICONS[icon] || Cube} />
    </Wrapper>
  );
}

ComponentIcon.defaultProps = {
  isActive: false,
  icon: null,
};

ComponentIcon.propTypes = {
  isActive: PropTypes.bool,
  icon: PropTypes.string,
};
