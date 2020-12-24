import styled, { css } from 'styled-components';

const Field = styled.div`
  height: 34px;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 11px;
  padding-top: 2px;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  ${({ error }) =>
    error &&
    css`
      border: 1px solid ${({ theme }) => theme.main.colors.lightOrange};
    `}
`;

export default Field;
