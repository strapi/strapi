import styled from 'styled-components';

const A = styled.a`
  display: flex;
  position: relative;
  padding-top: 1rem;
  padding-bottom: 0.2rem;
  padding-left: 1.6rem;
  min-height: 3.6rem;
  line-height: 1.8rem;
  border-left: 0.3rem solid transparent;
  cursor: pointer;
  color: ${props => props.theme.main.colors.leftMenu['link-color']};
  text-decoration: none;
  -webkit-font-smoothing: antialiased;

  &:hover {
    color: ${props => props.theme.main.colors.white};
    background: ${props => props.theme.main.colors.leftMenu['link-hover']};
    border-left: 0.3rem solid ${props => props.theme.main.colors.strapi.blue};
    text-decoration: none;
  }

  &:focus {
    color: ${props => props.theme.main.colors.white};
    text-decoration: none;
  }

  &:visited {
    color: ${props => props.theme.main.colors.leftMenu['link-color']};
  }

  &.linkActive {
    color: white !important;
    border-left: 0.3rem solid ${props => props.theme.main.colors.strapi.blue};
  }
`;

export default A;
