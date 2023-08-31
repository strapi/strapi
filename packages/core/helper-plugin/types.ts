import type { MessageDescriptor, PrimitiveType } from 'react-intl';

export interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}
