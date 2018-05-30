import styled from 'styled-components';

const Div = styled.div`
  overflow-x: hidden;
  width: calc(100% + 60px);
  margin: ${props => props.show ? '-100px -30px 30px' : '-280px -30px 120px'};
  background: #fff;
  box-shadow: 0 2px 4px #E3E9F3;
  padding: 18px 30px 0px 30px;
  transition: ${props => props.show ? 'margin-top .3s ease-out, margin-bottom .2s ease-out' : 'margin .3s ease-in'};;
`;


export default Div;
