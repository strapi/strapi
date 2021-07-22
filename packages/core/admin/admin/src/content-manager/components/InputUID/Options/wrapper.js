import styled from 'styled-components';

const wrapper = styled.div`
  position: absolute;
  width: 100%;
  margin-top: 3px;
  border: 1px solid ${props => props.theme.main.colors.border};
  border-radius: 2px;
  background-color: white;
  z-index: 11;
`;

export default wrapper;
