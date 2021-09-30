import React from 'react';
import { ThemeProvider } from 'styled-components';
import 'bootstrap/dist/css/bootstrap.css';

const theme = {
  main: {
    colors: {
      black: '#333740',
      white: '#ffffff',
      red: '#ff203c',
      orange: '#ff5d00',
      lightOrange: '#f64d0a',
      yellow: '#ffd500',
      green: '#6dbb1a',
      blue: '#0097f7',
      teal: '#5bc0de',
      pink: '#ff5b77',
      purple: '#613d7c',
      gray: '#464a4c',
      border: '#e3e9f3',
      'gray-dark': '#292b2c',
      grayLight: '#636c72',
      'gray-lighter': '#eceeef',
      'gray-lightest': '#f7f7f9',
      brightGrey: '#f0f3f8',
      darkGrey: '#e3e9f3',
      lightGrey: '#fafafa',
      lightestGrey: '#fbfbfb',
      mediumGrey: '#f2f3f4',
      grey: '#9ea7b8',
      greyDark: '#292b2c',
      greyAlpha: 'rgba(227, 233, 243, 0.5)',
      lightestBlue: '#e4f0fc',
      lightBlue: '#e6f0fb',
      mediumBlue: '#007eff',
      darkBlue: '#aed4fb',
      pale: '#f7f8f8',
      content: {
        background: '#fafafb',
        'background-alpha': 'rgba(14, 22, 34, 0.02)',
      },
      leftMenu: {
        'link-hover': '#1c2431',
        'link-color': '#919bae',
        'title-color': '#5b626f',
        'background-header-link': '#007eff',
      },
      strapi: {
        'gray-light': '#eff3f6',
        gray: '#535f76',
        'blue-darker': '#18202e',
        'blue-dark': '#151c2e',
        blue: '#0097f7',
      },
    },
    fontWeights: {
      regular: 400,
      semiBold: 500,
      bold: 600,
      black: 900,
    },
    sizes: {
      borderRadius: '2px',
      header: {
        height: '6rem',
      },
      leftMenu: {
        height: '6rem',
        width: '24rem',
      },
      margins: {
        // TODO:
        sm: '10px',
      },
      paddings: {
        // TODO
        xs: '5px',
        sm: '10px',
        smd: '20px',
        md: '30px',
        lg: '40px',
      },
      fonts: {
        xs: '11px',
        sm: '12px',
        md: '13px',
        lg: '18px',
        xl: '24px',
      },
    },
  },
};

// eslint-disable-next-line react/prop-types
const TempTP = ({ children }) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default TempTP;
