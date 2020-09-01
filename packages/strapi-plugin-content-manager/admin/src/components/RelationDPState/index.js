import styled from 'styled-components';

const RelationDPState = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:before {
    content: '';
    display: flex;
    width: 6px;
    height: 6px;
    margin-bottom: 1px;
    margin-left: 10px;
    border-radius: 50%;
    background-color: ${({ theme, isDraft }) =>
      isDraft ? theme.main.colors.mediumBlue : theme.main.colors.green};
  }
`;

export default RelationDPState;
