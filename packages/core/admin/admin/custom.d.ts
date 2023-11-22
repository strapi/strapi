import { type StrapiTheme } from '@strapi/design-system';
import { type Attribute } from '@strapi/types';
import { type BaseEditor } from 'slate';
import { type HistoryEditor } from 'slate-history';
import { type ReactEditor } from 'slate-react';

import { type LinkEditor } from './src/content-manager/components/BlocksInput/plugins/withLinks';

import type { StrapiFeaturesConfig } from '../shared/admin';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}

declare module 'slate' {
  interface CustomTypes {
    Editor: Omit<BaseEditor & ReactEditor & HistoryEditor & LinkEditor, 'children'> & {
      children: Attribute.BlocksValue;
    };
    Element: Attribute.BlocksNode;
    Descendant: Attribute.BlocksInlineNode | Text;
    Text: Attribute.BlocksTextNode;
  }
}

interface BrowserStrapi {
  backendURL: string;
  isEE: boolean;
  future: {
    isEnabled: (name: keyof StrapiFeaturesConfig['future']) => boolean;
  };
  features: {
    SSO: 'sso';
    AUDIT_LOGS: 'audit-logs';
    REVIEW_WORKFLOWS: 'review-workflows';
    isEnabled: (featureName?: string) => boolean;
  };
  flags: {
    promoteEE?: boolean;
    nps?: boolean;
    promoteEE: boolean;
  };
  projectType: 'Community' | 'Enterprise';
  telemetryDisabled: boolean;
}

declare global {
  interface Window {
    strapi: BrowserStrapi;
  }
}
