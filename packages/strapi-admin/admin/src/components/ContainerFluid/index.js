import styled from 'styled-components';
import { Container } from 'reactstrap';

const ContainerFluid = styled(Container)`
  padding: 18px 30px !important;
`;

ContainerFluid.defaultProps = {
  fluid: true,
};

export default ContainerFluid;
