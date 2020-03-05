import styled from 'styled-components';
import { CustomRow as Base } from '@buffetjs/styles';

const CustomRow = styled(Base)`
  &:before {
    content: '-';
    display: inline-block;
    line-height: 1.1em;
    color: transparent;
    background-color: transparent;
    position: absolute;
    left: 30px !important;
    width: calc(100% - 60px) !important;
    height: 1px;
    margin-top: -1px;
  }
`;

export default CustomRow;
