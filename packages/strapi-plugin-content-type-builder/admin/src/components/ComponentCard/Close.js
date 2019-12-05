import styled from 'styled-components';
import { Remove } from '@buffetjs/icons';

const Close = styled(Remove)`
  > path {
    fill: #007eff;
    &:hover {
      fill: #aed4fb;
    }
  }
`;

export default Close;
