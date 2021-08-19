import { createGlobalStyle } from 'styled-components';
// TODO: DS check if needed with @HichamELBSI @mfrachet
import faBrandsLight from '@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff';
import faBrandsLight2 from '@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2';
import faRegularLight from '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff';
import faRegularLight2 from '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2';
import faSolidHeavy from '@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff';
import faSolidHeavy2 from '@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2';

const Fonts = createGlobalStyle`
  @font-face {
    font-family: 'FontAwesome';
    src: url(${faBrandsLight2}) format("woff2"), url(${faBrandsLight}) format("woff");
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'FontAwesome';
    src: url(${faRegularLight2}) format("woff2"), url(${faRegularLight}) format("woff");
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'FontAwesome';
    src: url(${faSolidHeavy2}) format("woff2"), url(${faSolidHeavy}) format("woff");
    font-weight: 400;
    font-style: normal;
  }
`;

export default Fonts;
