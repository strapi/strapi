import styled from 'styled-components';

const Wrapper = styled.div`
  margin: auto;
  width: 41.6rem;
  padding: 20px 30px 25px 30px;
  border-radius: 2px;
  border-top: 2px solid ${({ borderColor }) => borderColor};
  background-color: #ffffff;
  box-shadow: 0 2px 4px 0 #e3e9f3;
`;

Wrapper.defaultProps = {
  borderColor: '#1c5de7',
};

export default Wrapper;
