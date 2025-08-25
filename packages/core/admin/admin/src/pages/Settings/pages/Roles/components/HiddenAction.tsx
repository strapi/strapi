import { styled } from 'styled-components';

import { cellWidth } from '../utils/constants';

const HiddenAction = styled.div`
  width: ${cellWidth};
` as any; // TODO: Put here to be able to link the design-system locally. To fix.

export { HiddenAction };
