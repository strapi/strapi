import styled from 'styled-components';
import { Container } from 'reactstrap';

const ContainerFluid = styled(Container)`
  padding: 0;
`;

ContainerFluid.defaultProps = {
  fluid: true,
};

export default ContainerFluid;
