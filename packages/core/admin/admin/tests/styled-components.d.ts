import 'styled-components';
import type { StrapiTheme } from '@strapi/design-system';

declare module 'styled-components' {
  export interface DefaultTheme extends StrapiTheme {}
}

export type ThemeConfig = {
  light: StrapiTheme;
  dark: StrapiTheme;
};
