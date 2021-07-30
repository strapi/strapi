import styled from 'styled-components';

const Wrapper = styled.div`
  height: 49px;
  display: flex;
  padding: 8px 3px 0 10px;
  background-color: #f3f4f4;
  user-select: none;
  overflow-x: auto;
  > button:nth-child(even) {
    border-left: 0;
    border-right: 0;
  }
  > button:first-child {
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }
  > button:last-child {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
    border-right: 1px solid rgba(16, 22, 34, 0.1);
  }
`;

export default Wrapper;
