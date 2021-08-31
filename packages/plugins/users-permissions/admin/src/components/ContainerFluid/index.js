import styled from 'styled-components';
import { Container } from 'reactstrap';

const ContainerFluid = styled(Container)`
  padding: ${({ padding }) => padding};
`;

ContainerFluid.defaultProps = {
  fluid: true,
  padding: '18px 30px !important',
};

export default ContainerFluid;
