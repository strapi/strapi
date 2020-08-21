import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const SubWrapper = styled.div`
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
`;

const MainWrapper = styled(SubWrapper)`
  > div {
    margin-right: 0;
    margin-left: 0;
  }
  padding: 22px 10px;
`;

const LinkWrapper = styled(SubWrapper)`
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: 7px 20px;
    border-top: 1px solid #f6f6f6;
    &:first-of-type {
      border-color: transparent;
    }
    &:not(:first-of-type) {
      margin-top: 0;
    }
  }
`;

const DeleteButton = styled(Flex)`
  color: ${({ theme }) => theme.main.colors.lightOrange};
  align-items: center;
  cursor: pointer;
  margin-left: 0.2rem;
  svg {
    width: 1.1rem !important;
    margin-right: 1rem;
  }
`;

export { LinkWrapper, MainWrapper, SubWrapper, DeleteButton };
