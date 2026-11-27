import * as React from 'react';

import { act, render, screen } from '@tests/utils';

import { DocumentMeta } from '../../../../../../hooks/useDocumentContext';
import { RelationModalRenderer, type Action } from '../RelationModal';

import type { UseDocument } from '../../../../../../hooks/useDocument';

jest.mock('../../../../../../hooks/useDocument', () => ({
  useDoc: jest.fn(),
  useDocument: jest.fn(),
}));

jest.mock('../../../../../../hooks/useDocumentLayout', () => ({
  useDocumentLayout: jest.fn(),
}));

jest.mock('../../../../../../features/DocumentRBAC', () => ({
  DocumentRBAC: ({ children }: { children: React.ReactNode }) => children,
  useDocumentRBAC: jest.fn((_name: string, selector: (state: unknown) => unknown) =>
    selector({ isLoading: false })
  ),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((_name: string, selector: (state: unknown) => unknown) =>
    selector({
      plugins: {
        'content-manager': {
          apis: {
            getDocumentActions: () => [],
          },
        },
      },
    })
  ),
}));

/**
 * Stands in for the real form layout: a Blocks field must never receive the string value of
 * the previous document while the form is switching documents.
 */
jest.mock('../../../FormLayout', () => {
  const { useForm } = jest.requireActual('@strapi/admin/strapi-admin') as {
    useForm: <T>(name: string, selector: (state: { values: T }) => T) => T;
  };

  type Field = { name: string; type: string };
  type Layout = Field[][][];

  return {
    FormLayout: ({ layout }: { layout: Layout }) => {
      const values = useForm<Record<string, unknown>>('FormLayoutMock', (state) => state.values);

      const descriptionIsBlocks = layout.some((panel) =>
        panel.some((row) =>
          row.some((field) => field.name === 'description' && field.type === 'blocks')
        )
      );

      if (descriptionIsBlocks && typeof values.description === 'string') {
        throw new Error('The form still holds the previous document values');
      }

      return <div data-testid="form-layout">{String(values.title)}</div>;
    },
  };
});

const { useDoc, useDocument } = jest.requireMock<
  typeof import('../../../../../../hooks/useDocument')
>('../../../../../../hooks/useDocument');
const { useDocumentLayout } = jest.requireMock<
  typeof import('../../../../../../hooks/useDocumentLayout')
>('../../../../../../hooks/useDocumentLayout');

const ROOT_META: DocumentMeta = {
  model: 'api::article.article',
  collectionType: 'collection-types',
  documentId: 'article-1',
};

const DOMAIN_META: DocumentMeta = {
  model: 'api::domain.domain',
  collectionType: 'collection-types',
  documentId: 'domain-1',
};

const blocks = [{ type: 'paragraph', children: [{ type: 'text', text: 'Article body' }] }];

const createDocument = (title: string, description: unknown, attributes: Record<string, unknown>) =>
  ({
    document: { documentId: `${title.toLowerCase()}-1`, title, description },
    meta: {},
    schema: { attributes, options: { draftAndPublish: false } },
    components: {},
    isLoading: false,
    getTitle: () => title,
    getInitialFormValues: () => ({ title, description }),
    validate: () => null,
    refetch: jest.fn(),
  }) as unknown as ReturnType<UseDocument>;

const rootDocument = createDocument('Article', blocks, {
  title: { type: 'string' },
  description: { type: 'blocks' },
});

const domainDocument = createDocument('Domain', 'Hello world', {
  title: { type: 'string' },
  description: { type: 'text' },
});

describe('RelationModalRenderer', () => {
  beforeEach(() => {
    (useDoc as jest.Mock).mockReturnValue({
      model: ROOT_META.model,
      collectionType: ROOT_META.collectionType,
      document: { documentId: ROOT_META.documentId },
    });

    (useDocument as jest.Mock).mockImplementation((meta: DocumentMeta) =>
      meta.model === ROOT_META.model ? rootDocument : domainDocument
    );

    (useDocumentLayout as jest.Mock).mockImplementation((model: string) => ({
      isLoading: false,
      error: null,
      edit: {
        layout:
          model === ROOT_META.model
            ? [
                [
                  [
                    { name: 'title', type: 'string' },
                    { name: 'description', type: 'blocks' },
                  ],
                ],
              ]
            : [
                [
                  [
                    { name: 'title', type: 'string' },
                    { name: 'description', type: 'text' },
                  ],
                ],
              ],
        settings: { mainField: 'title', relationOpenMode: 'modal' },
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the previous document values when going back to the parent', async () => {
    let dispatch: ((action: Action) => void) | undefined;

    render(
      <RelationModalRenderer>
        {({ dispatch: modalDispatch }) => {
          dispatch = modalDispatch;

          return null;
        }}
      </RelationModalRenderer>,
      {
        initialEntries: ['/content-manager/collection-types/api::article.article/article-1'],
      }
    );

    act(() => {
      dispatch?.({
        type: 'GO_TO_RELATION',
        payload: { document: DOMAIN_META, shouldBypassConfirmation: true },
      });
    });
    expect(await screen.findByTestId('form-layout')).toHaveTextContent('Domain');

    act(() => {
      dispatch?.({ type: 'GO_BACK', payload: { shouldBypassConfirmation: true } });
    });
    expect(await screen.findByTestId('form-layout')).toHaveTextContent('Article');
  });
});
