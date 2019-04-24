import styled from 'styled-components';
import FilterOptionsCTA from '../FilterOptionsCTA';

const Remove = styled(FilterOptionsCTA)`
  &:after {
    content: '\f068';
    font-family: FontAwesome;
    font-size: 8px;
    color: #007eff;
  }
`;

export default Remove;
