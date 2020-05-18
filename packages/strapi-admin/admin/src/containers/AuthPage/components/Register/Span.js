import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const Span = styled(Text)`
  color: #0097f7;
  cursor: pointer;
`;

Span.defaultProps = {
  as: 'span',
};

export default Span;
