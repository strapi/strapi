import styled from 'styled-components';

const Wrapper = styled.div`
  margin-bottom: ${({ hasError }) => (hasError ? '1.7rem' : '2.3rem')};
`;

Wrapper.defaultProps = {
  hasError: false,
};

export default Wrapper;
