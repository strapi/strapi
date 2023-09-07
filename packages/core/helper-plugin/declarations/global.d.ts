export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      telemetryDisabled: boolean;
      projectType: 'Enterprise' | 'Community';
    };
  }
}

import { StrapiTheme } from '@strapi/design-system';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}
