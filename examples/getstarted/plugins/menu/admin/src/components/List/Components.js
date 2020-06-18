import styled from 'styled-components';

const Wrapper = styled.div`
  border-radius: 0.2rem;
  background-color: #ffffff;
  box-shadow: 0 0.2rem 0.4rem 0 #e3e9f3;
`;

const Flex = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4.1rem 1rem 0 2.8rem;
`;

const Title = styled.div`
  flex: 2;
  width: 20%;
  color: #333740;
  font-family: Lato;
  font-size: 1.8rem;
  font-weight: 600;
  line-height: 2.2rem;
  align-items: flex-start;
`;

const ListWrapper = styled.div`
  ul {
    margin-top: 1.5rem;
    padding: 0;
    list-style: none;
    li:last-child {
      border-bottom: none;
    }
    &.padded-list {
      padding-top: 3px !important;
    }
  }
  &.loading-container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-height: 162px;
    padding-top: 20px;
    &.role-container {
      min-height: 142px !important;
      padding-top: 0;
    }
  }
`;

export { Flex, ListWrapper, Title, Wrapper };
