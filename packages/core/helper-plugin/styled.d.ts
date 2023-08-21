import 'styled-components';

declare module 'styled-components' {
  export interface ThemeSizes {
    input: {
      S: string;
      M: string;
    };
    accordions: {
      S: string;
      M: string;
    };
    badge: {
      S: string;
      M: string;
    };
    button: {
      S: string;
      M: string;
      L: string;
    };
  }

  export interface CommonTheme {
    sizes: ThemeSizes;
    zIndices: [5, 10, 15, 20];
    spaces: [
      '0px',
      '4px',
      '8px',
      '12px',
      '16px',
      '20px',
      '24px',
      '32px',
      '40px',
      '48px',
      '56px',
      '64px'
    ];
    borderRadius: '4px';
    mediaQueries: {
      tablet: string;
      mobile: string;
    };
    fontSizes: [string, string, string, string, string, string];
    lineHeights: [1.14, 1.22, 1.25, 1.33, 1.43, 1.45, 1.5];
    fontWeights: {
      regular: 400;
      semiBold: 500;
      bold: 600;
    };
  }

  export interface ThemeColors {
    alternative100: string;
    alternative200: string;
    alternative500: string;
    alternative600: string;
    alternative700: string;
    buttonNeutral0: string;
    buttonPrimary500: string;
    buttonPrimary600: string;
    danger100: string;
    danger200: string;
    danger500: string;
    danger600: string;
    danger700: string;
    neutral0: string;
    neutral100: string;
    neutral1000: string;
    neutral150: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
    neutral900: string;
    primary100: string;
    primary200: string;
    primary500: string;
    primary600: string;
    primary700: string;
    secondary100: string;
    secondary200: string;
    secondary500: string;
    secondary600: string;
    secondary700: string;
    success100: string;
    success200: string;
    success500: string;
    success600: string;
    success700: string;
    warning100: string;
    warning200: string;
    warning500: string;
    warning600: string;
    warning700: string;
  }

  export interface ThemeShadows {
    filterShadow: string;
    focus: string;
    focusShadow: string;
    popupShadow: string;
    tableShadow: string;
  }

  export interface DefaultTheme extends CommonTheme {
    colors: ThemeColors;
    shadows: ThemeShadows;
  }
}
