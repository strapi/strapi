import styled from 'styled-components';

const Wrapper = styled.div`
  padding-bottom: ${({ canCopy }) => (canCopy ? '19px' : '29px')};
  border-top: 1px solid rgba(14, 22, 34, 0.04);
`;

export default Wrapper;
