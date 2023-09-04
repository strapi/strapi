import type { MessageDescriptor, PrimitiveType } from 'react-intl';

export interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

// @TODO: When we find a way to share types between packages,
// we should use that instead of duplicating the Permission interface
export interface Permission {
  action: string;
  subject?: string | object | null;
  properties?: object;
  conditions?: string[];
}
