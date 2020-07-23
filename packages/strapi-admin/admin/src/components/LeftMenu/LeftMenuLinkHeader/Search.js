import styled from 'styled-components';

const Search = styled.input`
  width: 100%;
  padding: 0 15px;
  outline: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.main.colors.white};
`;

export default Search;
