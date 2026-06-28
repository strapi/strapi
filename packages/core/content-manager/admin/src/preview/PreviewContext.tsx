import * as React from 'react';

import { createContext, type FieldContentSourceMap } from '@strapi/admin/strapi-admin';

import type { UseDocument } from '../hooks/useDocument';
import type { EditLayout } from '../hooks/useDocumentLayout';
import type { Schema } from '@strapi/types';

type PopoverField = FieldContentSourceMap & {
  position: DOMRect;
  attribute: Schema.Attribute.AnyAttribute;
};

type PreviewContextValue = {
  url: string;
  title: string;
  document: NonNullable<ReturnType<UseDocument>['document']>;
  meta: NonNullable<ReturnType<UseDocument>['meta']>;
  schema: NonNullable<ReturnType<UseDocument>['schema']>;
  components: NonNullable<ReturnType<UseDocument>['components']>;
  layout: EditLayout;
  onPreview: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  popoverField: PopoverField | null;
  setPopoverField: (value: PopoverField | null) => void;
};

const [PreviewProvider, usePreviewContext] = createContext<PreviewContextValue>('PreviewPage');

export { PreviewProvider, usePreviewContext };
export type { PopoverField, PreviewContextValue };
