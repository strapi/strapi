import styled from 'styled-components';

const Wrapper = styled.div`
  padding-left: 200px;
  padding-bottom: ${({ theme }) => theme.spaces[4]};
  padding-top: ${({ theme }) => theme.spaces[6]};
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
