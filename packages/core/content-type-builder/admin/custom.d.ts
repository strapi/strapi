/// <reference types="vite/client" />

import { type StrapiTheme } from '@strapi/design-system';

declare module 'styled-components' {
  export interface DefaultTheme extends StrapiTheme {}
}
