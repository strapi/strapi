import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
  margin-right: 5px;
  background-color: #ffffff;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  cursor: pointer;
  font-size: 11px;
  color: ${({ color }) => color};

  > svg {
    margin: auto;
  }
`;

Wrapper.defaultProps = {
  color: '#b3b5b9',
};

export default Wrapper;
