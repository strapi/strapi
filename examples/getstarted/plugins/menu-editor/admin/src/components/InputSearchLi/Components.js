import styled from 'styled-components';

const Wrapper = styled.div`
  height: 3.6rem;
  margin: 0 !important;
  padding: 0rem 1rem;
  font-size: 13px;
  font-weight: 500;
  line-height: 3.6rem;
  border-bottom: 1px solid #f6f6f6;
  &:hover {
    background-color: #fafafb;
    background-size: 3.6rem;
    > div {
      > div:last-child {
        color: #4b515a;
      }
    }
  }
  &:after {
    content: '';
    display: block;
  }
  > div {
    display: flex;
    justify-content: space-between;
    > div:last-child {
      cursor: pointer;
      color: #b3b5b9;
    }
  }
  a {
    margin-left: 10px;
    color: #1c5de7;
    font-size: 10px;
    cursor: pointer;
  }
`;

export default Wrapper;
