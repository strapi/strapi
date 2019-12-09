import styled from 'styled-components';
import { Button } from '@buffetjs/core';

const CustomButton = styled(Button)`
  line-height: 30px;
  svg {
    height: 11px;
    width: 11px;
    vertical-align: middle;
  }
`;

export default CustomButton;
