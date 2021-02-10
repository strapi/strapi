import styled from 'styled-components';

export const TabNavRaw = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const TabsRaw = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-left: ${props => (props.position === 'right' ? 'auto' : 0)};
  border-bottom: 1px solid ${props => props.theme.main.colors.brightGrey};
`;

export const TabButton = styled.button`
  height: 3.8rem;
  font-size: 1.2rem;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  border-bottom: 2px solid ${props => (props['aria-selected'] ? '#007eff' : 'transparent')};
  font-weight: ${props => (props['aria-selected'] ? 600 : 500)};
  color: ${props => (props['aria-selected'] ? '#007eff' : '#9ea7b8')};
  margin-left: 3rem;
  padding: 0;
`;

export const TabPanelRaw = styled.div`
  padding: 2.2rem 0;
`;
