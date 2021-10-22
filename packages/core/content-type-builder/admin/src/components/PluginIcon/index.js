/**
 *
 * PluginIcon
 *
 */

import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const IconWrapper = styled.span`
  svg.svg-inline--fa.fa-w-20 {
    width: 1rem;
  }
`;

const PluginIcon = () => (
  <IconWrapper>
    <FontAwesomeIcon icon="paint-brush" />
  </IconWrapper>
);

export default PluginIcon;
