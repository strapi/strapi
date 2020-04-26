import styled from 'styled-components';

import CardControlWrapper from './CardControlWrapper';

const CardPreviewWrapper = styled.div`
  position: relative;
  height: 20rem;
  &:hover ${CardControlWrapper} {
    opacity: 1;
  }
`;

export default CardPreviewWrapper;
