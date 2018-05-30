import styled from 'styled-components';

const Div = styled.div`
  display: flex;
  min-height: 36px;
  border-left: ${props => props.borderLeft ? '3px solid #007EFF' : '0px' };
  padding-left: ${props => props.borderLeft ? '10px' : '13px' };
  margin-bottom: 0px !important;

  input, select{
    margin: 0px 5px !important;
  }
`;

export default Div;
