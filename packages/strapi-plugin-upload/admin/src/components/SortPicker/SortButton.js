import styled from 'styled-components';

const SortButton = styled.button`
  height: 32px;
  background: #ffffff;
  color: #292b2c;
  line-height: 30px;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  font-weight: 500;
  padding: 0 10px;
  font-size: 13px;
  &:active,
  &:focus {
    outline: 0;
  }

  ${({ isActive }) =>
    isActive &&
    `
    color #007EFF;
    border-color: #AED4FB;
    background-color: #E6F0FB;
  `}
`;

export default SortButton;
