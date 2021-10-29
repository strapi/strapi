import { createGlobalStyle } from 'styled-components';

const loadCss = async () => {
  await import(/* webpackChunkName: "fontawesome-css" */ 'font-awesome/css/font-awesome.min.css');
  await import(
    /* webpackChunkName: "fontawesome-css-all" */ '@fortawesome/fontawesome-free/css/all.css'
  );
  await import(/* webpackChunkName: "fontawesome-js" */ '@fortawesome/fontawesome-free/js/all.min');
};

loadCss();

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

export default GlobalStyle;
