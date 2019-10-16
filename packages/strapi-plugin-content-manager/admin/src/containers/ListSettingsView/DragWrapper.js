import styled from 'styled-components';

const DragWrapper = styled.div`
  position: relative;
  padding: 11px 40px 11px 11px;
  margin-top: 7px;
  margin-bottom: 10px;
  border: 1px dashed #e3e9f3;
  border-radius: 2px;
  > div,
  > div > div {
    margin: 0;
    padding: 0;
  }
  > div > div {
    overflow-x: auto;
    overflow-y: hidden;
  }
`;

export default DragWrapper;
