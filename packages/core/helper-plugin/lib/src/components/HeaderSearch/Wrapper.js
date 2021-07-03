import styled from 'styled-components';

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 27rem;
  display: flex;
  align-items: center;
  overflow: hidden;
  min-width: 44rem;
  height: 6rem;
  padding-right: 20px;
  background-color: #ffffff;
  border-right: 1px solid #f3f4f4;
  z-index: 1050;
  color: #9ea7b8;
  line-height: 6rem;
  letter-spacing: 0;

  > div:first-child {
    height: 100%;

    margin-right: 10px;
    > svg {
      color: #b3b5b9;
      vertical-align: middle;
    }
  }

  input {
    position: relative;
    width: 100%;
    outline: 0;

    &::placeholder {
      color: #9ea7b8 !important;
      font-size: 13px !important;
    }
  }

  > div:nth-child(2) {
    display: flex;
    flex: 2;
  }
`;

export default Wrapper;
