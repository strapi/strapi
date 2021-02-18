import styled from 'styled-components';

const NumberCard = styled.div`
  width: 1.9rem;
  height: 1.4rem;
  background-color: ${({ theme }) => theme.main.colors.white};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
`;

export default NumberCard;
