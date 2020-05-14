import styled from 'styled-components';
import { Button as Base } from '@buffetjs/core';

const Button = styled(Base)`
  width: 100%;
  text-transform: uppercase;
`;

Button.defaultProps = {
  color: 'primary',
  type: 'button',
};

export default Button;
