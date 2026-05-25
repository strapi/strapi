/// <reference types="vite/client" />
/// <reference types="@strapi/types/globals-admin" />

import { type StrapiTheme } from '@strapi/design-system';

declare module 'styled-components' {
  export interface DefaultTheme extends StrapiTheme {}
}
