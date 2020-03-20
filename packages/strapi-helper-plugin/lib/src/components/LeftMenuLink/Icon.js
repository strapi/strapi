import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import colors from '../../assets/styles/colors';

const LeftMenuIcon = styled(({ ...props }) => <FontAwesomeIcon {...props} icon="circle" />)`
  position: absolute;
  top: calc(50% - 0.3rem);
  left: 1.4rem;
  font-size: 0.7rem;
  color: ${colors.leftMenu.darkGrey};
`;

export default LeftMenuIcon;
