import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const Content = styled(Text)`
  width: ${({ small }) => (small ? '200px' : '100%')};
  line-height: 1.8rem;
  margin: auto;
  min-height: 36px;
`;

Content.defaultProps = {
  lineHeight: '18px',
  color: 'lightOrange',
};

export default Content;
