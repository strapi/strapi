import styled from 'styled-components';
import { Text as Base } from '@buffetjs/core';

const Text = styled(Base)`
  color: inherit;
  font-weight: ${({ fontWeight }) => fontWeight};
`;

Text.defaultProps = {
  as: 'span',
  fontWeight: 400,
};

export default Text;
