import styled from 'styled-components';
import { Flex, Text } from '@buffetjs/core';

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

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  border-radius: 2px;

  height: 36px;
  padding: 0 15px;
  ${({ theme, isGreen }) =>
    isGreen
      ? `
      ${Text} {
        color: ${theme.main.colors.green};
      }
      background-color: #E6F8D4;
      border: 1px solid #AAD67C;
    `
      : `
      ${Text} {
        color: ${theme.main.colors.mediumBlue};
      }
      background-color: ${theme.main.colors.lightBlue};
      border: 1px solid #a5d5ff;
  `}
`;

export { LinkWrapper, MainWrapper, SubWrapper, DeleteButton, StatusWrapper };
