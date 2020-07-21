import styled from 'styled-components';

const ActionRowWrapper = styled.div`
  display: flex;
  height: 36px;
  border-radius: 2px;
  margin-bottom: 18px;
  background-color: ${({ theme, isGrey }) => (isGrey ? '#fafafb' : theme.main.colors.white)};
`;

export default ActionRowWrapper;
