import styled from 'styled-components';
import FilterOptionsCTA from '../FilterOptionsCTA';

const Add = styled(FilterOptionsCTA)`
  &:after {
    content: '\f067';
    font-family: FontAwesome;
    font-size: 8px;
    font-weight: 400;
    color: #007eff;
  }
`;

export default Add;
