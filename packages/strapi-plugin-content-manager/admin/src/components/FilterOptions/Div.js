import styled from 'styled-components';

const Div = styled.div`
  display: flex;
  border-left: ${props => props.borderLeft ? '3px solid #007EFF' : '0px' };
  padding-left: ${props => props.borderLeft ? '10px' : '13px' };
`;

export default Div;
