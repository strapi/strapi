import { createGlobalStyle } from 'styled-components';

const loadCss = async () => {
  await import(/* webpackChunkName: "cropper-css" */ 'cropperjs/dist/cropper.css');
};

loadCss();

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

export default GlobalStyle;
