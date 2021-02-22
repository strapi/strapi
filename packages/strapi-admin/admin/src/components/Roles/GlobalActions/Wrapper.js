import styled from 'styled-components';

const Wrapper = styled.div`
  padding-left: 165px;
  padding-bottom: 25px;
  padding-top: 26px;
  ${({ disabled, theme }) =>
    `
    input[type='checkbox'] {
      &:after {
        color: ${!disabled ? theme.main.colors.mediumBlue : theme.main.colors.grey};
      }
    }
    cursor: initial;
    `}
`;

export default Wrapper;
