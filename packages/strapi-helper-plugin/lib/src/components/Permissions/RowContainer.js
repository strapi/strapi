import styled from 'styled-components';

// TODO : @HichamELBSI This need to be updated when lists are standardized
const RowContainer = styled.div`
  margin: ${({ isWhite }) => isWhite && '9px 0px'};
`;

export default RowContainer;
