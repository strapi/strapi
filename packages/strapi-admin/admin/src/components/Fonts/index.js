import { createGlobalStyle } from 'styled-components';

import faBrandsLight from '@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff';
import faBrandsLight2 from '@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2';
import faRegularLight from '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff';
import faRegularLight2 from '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2';
import faSolidHeavy from '@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff';
import faSolidHeavy2 from '@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2';

/* Lato Regular */
import latoRegular from '@buffetjs/styles/webfonts/Lato-Regular.ttf';
import latoRegularWoff from '@buffetjs/styles/webfonts/Lato-Regular.woff';
import latoRegularWoff2 from '@buffetjs/styles/webfonts/Lato-Regular.woff2';
/* Lato SemiBold */
import latoSemiBold from '@buffetjs/styles/webfonts/Lato-SemiBold.ttf';
import latoSemiBoldWoff from '@buffetjs/styles/webfonts/Lato-SemiBold.woff';
import latoSemiBoldWoff2 from '@buffetjs/styles/webfonts/Lato-SemiBold.woff2';
/* Lato Bold */
import latoBold from '@buffetjs/styles/webfonts/Lato-Bold.ttf';
import latoBoldWoff from '@buffetjs/styles/webfonts/Lato-Bold.woff';
import latoBoldWoff2 from '@buffetjs/styles/webfonts/Lato-Bold.woff2';
/* Lato Black */
import latoBlack from '@buffetjs/styles/webfonts/Lato-Black.ttf';
import latoBlackWoff from '@buffetjs/styles/webfonts/Lato-Black.woff';
import latoBlackWoff2 from '@buffetjs/styles/webfonts/Lato-Black.woff2';

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
  /* Lato Regular - 400 */
  @font-face {
    font-family: 'Lato';
    src: url(${latoRegularWoff2}) format('woff2'), url(${latoRegularWoff}) format('woff'), url(${latoRegular}) format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  /* Lato Semi-Bold - 500 */
  @font-face {
    font-family: 'Lato';
    src: url(${latoSemiBoldWoff2}) format('woff2'), url(${latoSemiBoldWoff}) format('woff'), url(${latoSemiBold}) format('truetype');
    font-weight: 500;
    font-style: normal;
  }
  /* Lato Bold - 600 */
  @font-face {
    font-family: 'Lato';
    src: url(${latoBoldWoff2}) format('woff2'), url(${latoBoldWoff}) format('woff'), url(${latoBold}) format('truetype');
    font-weight: 600;
    font-style: normal;
  }
  /* Lato Black - 900 */
  @font-face {
    font-family: 'Lato';
    src:  url(${latoBlackWoff2}) format('woff2'), url(${latoBlackWoff}) format('woff'), url(${latoBlack}) format('truetype');
    font-weight: 900;
    font-style: normal;
  }
`;

export default Fonts;
