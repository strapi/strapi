/*
 *
 * This component should be removed after the media lib feature
 *
 */

import styled from 'styled-components';

const Text = styled.p`
  margin: 0;
  line-height: 18px;
  color: ${({ colors, color }) => colors[color] || color};
  font-size: ${({ fontSizes, fontSize }) => fontSizes[fontSize]};
  font-weight: ${({ fontWeights, fontWeight }) => fontWeights[fontWeight]};
  text-transform: ${({ textTransform }) => textTransform};
  letter-spacing: ${({ letterSpacing }) => letterSpacing};
`;

Text.defaultProps = {
  letterSpacing: 'normal',
  color: 'greyDark',
  fontSize: 'md',
  fontWeight: 'regular',
  textTransform: 'none',
  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '18px',
  },
  fontWeights: {
    regular: 400,
    semiBold: 500,
    bold: 600,
    black: 900,
  },
  colors: {
    black: '#3b3b3b',
    white: '#ffffff',
    red: '#ff203c',
    orange: '#ff5d00',
    yellow: '#ffd500',
    green: '#27b70f',
    blue: '#0097f7',
    teal: '#5bc0de',
    pink: '#ff5b77',
    purple: '#613d7c',
    gray: '#464a4c',
    'gray-dark': '#292b2c',
    'gray-light': '#636c72',
    'gray-lighter': '#eceeef',
    'gray-lightest': '#f7f7f9',
    brightGrey: '#f0f3f8',
    darkGrey: '#e3e9f3',
    lightGrey: '#fafafa',
    lightestGrey: '#fbfbfb',
    mediumGrey: '#F2F3F4',
    grey: '#9ea7b8',
    greyDark: '#292b2c',
    greyAlpha: 'rgba(227, 233, 243, 0.5)',
    lightBlue: '#E6F0FB',
    mediumBlue: '#007EFF',
    darkBlue: '#AED4FB',

    content: {
      background: '#fafafb',
      'background-alpha': 'rgba(14, 22, 34, 0.02)',
    },
    leftMenu: {
      'link-hover': '#1c2431',
      'link-color': '#919bae',
      'title-color': '#5b626f',
    },
    strapi: {
      'gray-light': '#eff3f6',
      gray: '#535f76',
      'blue-darker': '#18202e',
      'blue-dark': '#151c2e',
      blue: '#0097f7',
    },
  },
};

export default Text;
