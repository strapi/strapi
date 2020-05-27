import styled from 'styled-components';

const Tab = styled.div`
  flex: 1;
  padding: 1rem;
  text-align: center;
  ${({ isActive, theme }) =>
    isActive
      ? {
        borderTop: `2px solid ${theme.main.colors.blue}`,
        backgroundColor: theme.main.colors.white,
      }
      : {
        backgroundColor: '#f2f3f4',
        cursor: 'pointer',
      }}
`;

export default Tab;
