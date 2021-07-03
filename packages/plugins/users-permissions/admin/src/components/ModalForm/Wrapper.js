import styled from 'styled-components';
import { Container } from 'reactstrap';

const Wrapper = styled(Container)`
  padding: 0;
`;

Wrapper.defaultProps = {
  fluid: true,
};

export default Wrapper;
