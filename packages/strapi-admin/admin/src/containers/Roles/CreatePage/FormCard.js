import styled from 'styled-components';

const FormCard = styled.div`
  padding: 2.5rem;
  background-color: ${({ theme }) => theme.main.colors.white};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: ${({ theme }) => `0 2px 4px 0 ${theme.main.colors.darkGrey}`};
`;

export default FormCard;
