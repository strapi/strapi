import { DesignSystemProvider } from '@strapi/design-system';
import { act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { fieldsStore, type FieldsState } from '../../store/fields';

import type { FieldProvenance, Source } from '../../constants';

export const field = (
  source: Source,
  review: FieldProvenance['review'] = null
): FieldProvenance => ({
  source,
  signal: 'token',
  drifted: false,
  model: 'test-model',
  agent: null,
  actor: null,
  recordedAt: null,
  review,
  reviewOutdated: false,
});

/**
 * Publishes the state the Provenance panel shares with the label actions.
 */
export const setFieldsState = (overrides: Partial<FieldsState> = {}) => {
  const state: FieldsState = {
    provenance: {
      locale: 'en',
      status: 'draft',
      publishRequiresReview: false,
      fields: {
        title: field('human-entered'),
        body: field('ai-generated'),
        seo: field('human-entered'),
      },
    },
    pending: [],
    canEdit: true,
    canUpdateFields: ['title', 'body', 'seo.metaTitle'],
    isSubmitting: false,
    markAsAi: jest.fn(),
    cancel: jest.fn(),
    ...overrides,
  };

  act(() => fieldsStore.set(state));

  return state;
};

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}} textComponent="span">
    <DesignSystemProvider locale="en">{children}</DesignSystemProvider>
  </IntlProvider>
);
