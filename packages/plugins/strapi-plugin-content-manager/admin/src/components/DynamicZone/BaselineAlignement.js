import styled from 'styled-components';

const BaselineAlignement = styled.div`
  padding-top: ${({ top }) => top};
`;

BaselineAlignement.defaultProps = {
  top: '1px',
};

export default BaselineAlignement;
