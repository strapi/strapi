import styled from 'styled-components';

const RelationDPState = styled.div`
  margin: auto;

  &:before {
    content: '';
    display: flex;
    width: 6px;
    height: 6px;
    margin-top: ${({ marginTop }) => marginTop};
    margin-left: ${({ marginLeft }) => marginLeft};
    margin-bottom: ${({ marginBottom }) => marginBottom};
    margin-right: ${({ marginRight }) => marginRight};
    border-radius: 50%;
    background-color: ${({ theme, isDraft, backgroundColor }) => {
      if (backgroundColor) {
        return backgroundColor;
      }

      return isDraft ? theme.main.colors.mediumBlue : theme.main.colors.green;
    }};
    border: ${({ border }) => border};
`;

RelationDPState.defaultProps = {
  border: 0,
  color: null,
  marginLeft: '10px',
  marginRight: '0',
  marginTop: '0',
  marginBottom: '1px',
};

export default RelationDPState;
