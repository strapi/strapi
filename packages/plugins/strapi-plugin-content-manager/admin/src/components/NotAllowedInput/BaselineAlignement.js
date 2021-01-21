import styled from 'styled-components';

const BaselineAlignement = styled.div`
  height: ${({ height }) => height};
`;

BaselineAlignement.defaultProps = {
  height: '7px',
};

export default BaselineAlignement;
