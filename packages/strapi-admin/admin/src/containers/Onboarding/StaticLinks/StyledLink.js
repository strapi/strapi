import styled from 'styled-components';

const StyledLink = styled.a`
  display: flex;
  width: 100%;
  height: 27px;
  padding: 0 20px;
  color: #919bae;
  span,
  svg {
    margin: auto 0;
  }
  svg {
    margin-right: 10px;
  }
  &:hover {
    background-color: #f7f8f8;
    text-decoration: none;
    color: #919bae;
  }
`;

export default StyledLink;
