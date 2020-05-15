import styled from 'styled-components';

const Container = styled.div`
  margin: 0 3.2rem 0 1.9rem;
  padding: 0 1.4rem 0 0rem;
  border-bottom: 1px solid rgba(14, 22, 34, 0.04);
  color: #333740;
  font-size: 1.3rem;
  > div {
    padding: 0;
    align-self: center;
  }
  > div:first-child {
    padding-left: 1.4rem;
  }
  > div:last-child {
    text-align: right;
  }
`;

const Flex = styled.div`
  display: flex;
  padding-left: 7px;
  font-weight: 600;
  > div:first-child {
    width: 17px;
    padding-top: 2px;
    > i,
    > svg {
      font-size: 12px;
      vertical-align: inherit;
    }
  }
  > div:last-child {
    width: 80%;
    margin-left: 54px;
    padding-left: 7px;
    text-align: left;
    font-weight: 500 !important;
  }
`;

const Row = styled.div`
  margin-top: 0 !important;
  position: relative;
  height: 5.4rem;
  line-height: 5.4rem;
  cursor: pointer;
  &:hover {
    background-color: #f7f8f8;
  }
  div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Wrapper = styled.div`
  > div:first-child {
    text-align: left;
  }
  > div:nth-of-type(2) {
    text-align: center;
  }
  strong {
    font-weight: 600;
  }
  b {
    font-weight: 500;
  }
`;

export { Container, Flex, Row, Wrapper };
