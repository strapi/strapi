import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const LeftMenuIcon = styled(({ ...props }) => <FontAwesomeIcon {...props} icon="circle" />)`
  position: absolute;
  top: calc(50% - 0.25rem);
  left: 1.5rem;
  font-size: 0.5rem;
  color: ${props => props.theme.main.colors.leftMenu['link-color']};
`;

export default LeftMenuIcon;
