/// <reference types="vite/client" />

import { type StrapiTheme } from '@strapi/design-system';
import { type BaseEditor } from 'slate';
import { type HistoryEditor } from 'slate-history';
import { type ReactEditor } from 'slate-react';

import type { LinkEditor } from './src/pages/EditView/components/FormInputs/BlocksInput/Blocks/Link';
import type { Schema, Modules } from '@strapi/types';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}

declare module 'slate' {
  interface CustomTypes {
    Editor: Omit<BaseEditor & ReactEditor & HistoryEditor & LinkEditor, 'children'> & {
      children: Schema.Attribute.BlocksValue;
    };
    Element: Schema.Attribute.BlocksNode;
    Descendant: Schema.Attribute.BlocksInlineNode | Text;
    Text: Schema.Attribute.BlocksTextNode;
  }
}

interface BrowserStrapi {
  backendURL: string;
  isEE: boolean;
  future: {
    isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => boolean;
  };
  /**
   * Permanent config flags from the project's `features` file. Separate from `features`
   * below, which carries EE licence feature names rather than configuration.
   */
  featureFlags: {
    isEnabled: (name: keyof Omit<Modules.Features.FeaturesConfig, 'future'>) => boolean;
  };
  features: {
    SSO: 'sso';
    AUDIT_LOGS: 'audit-logs';
    REVIEW_WORKFLOWS: 'review-workflows';
    isEnabled: (featureName?: string) => boolean;
  };
  isTrial: boolean;
  /**
   * @deprecated Use `isTrial`. Alias kept for third-party admin code that read
   * this before the rename; removed in the next major.
   */
  isTrialLicense: boolean;
  flags: {
    promoteEE?: boolean;
    nps?: boolean;
    docLinks?: boolean;
  };
  projectType: 'Community' | 'Growth' | 'Enterprise';
  telemetryDisabled: boolean;
  ai: {
    enabled: boolean;
  };
}

declare global {
  interface Window {
    strapi: BrowserStrapi;
  }
}
