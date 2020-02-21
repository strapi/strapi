import styled from 'styled-components';

const wrapper = styled.div`
  position: absolute;
  background-color: white;
  border: 1px solid ${props => props.theme.main.colors.border};
  width: 100%;
  margin-top: 3px;
  z-index: 10;
  border-radius: 2px;
`;

export default wrapper;
