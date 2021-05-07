import styled from 'styled-components';

/* eslint-disable indent */
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
          borderTop: '2px solid transparent',
          backgroundColor: '#f2f3f4',
          cursor: 'pointer',
        }}
`;

export default Tab;
