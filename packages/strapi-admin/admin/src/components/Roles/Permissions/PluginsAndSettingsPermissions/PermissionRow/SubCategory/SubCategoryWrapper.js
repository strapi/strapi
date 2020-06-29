import styled from 'styled-components';

const SubCategoryWrapper = styled.div`
  padding-bottom: 0.8rem;
  ${({ disabled, theme }) =>
    `
    input[type='checkbox'] {
        &:after {
          color: ${!disabled ? theme.main.colors.mediumBlue : theme.main.colors.grey};
        }
      }
    `}
`;

export default SubCategoryWrapper;
