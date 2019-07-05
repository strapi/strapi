import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  > div:first-child {
    height: 30px;
    width: 20px;
    margin-right: 10px;
    text-align: right;
    line-height: 30px;
  }
`;

const Field = styled.div`
  position: relative;
  height: 30px;
  width: 100%;
  margin-bottom: 6px;
  padding-left: 10px;
  justify-content: space-between;
  background: #fafafb;
  line-height: 28px;
  color: #333740;
  font-size: 13px;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  &:hover {
    cursor: move;
  }
  > img {
    max-width: 8px;
    margin-right: 10px;
    margin-top: -1px;
  }
`;

export { Wrapper, Field };
