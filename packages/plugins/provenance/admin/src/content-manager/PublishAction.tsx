import { useFieldsStore } from '../store/fields';

import type {
  DocumentActionComponent,
  DocumentActionProps,
} from '@strapi/content-manager/strapi-admin';

/**
 * Wraps the Content Manager publish action: while an AI declaration waits for the next save,
 * publishing would put the value online before it is labelled, and around the review rule.
 */
export const withPendingDeclarations = (Publish: DocumentActionComponent) => {
  const PublishWhenDeclared: DocumentActionComponent = (props: DocumentActionProps) => {
    const description = Publish(props);
    const store = useFieldsStore();
    const waiting = store?.pending.some((item) => item.decision === 'ai') === true;

    return description && waiting ? { ...description, disabled: true } : description;
  };

  PublishWhenDeclared.type = Publish.type;

  return PublishWhenDeclared;
};
