import * as React from 'react';

import { RenderOptions, render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { type HistoryContextValue, HistoryProvider } from '../../pages/History';
import { VersionHeader } from '../VersionHeader';

import type { UID } from '@strapi/types';

const render = (
  context: Partial<HistoryContextValue>,
  initialEntry: Exclude<RenderOptions['initialEntries'], undefined>[number]
) => {
  const isSingleType =
    typeof initialEntry === 'string'
      ? initialEntry.startsWith('/single-types')
      : initialEntry.pathname!.startsWith('/single-types');

  const path = isSingleType
    ? '/:collectionType/:slug/history'
    : '/:collectionType/:slug/:id/history';

  const contextWithSchema: Partial<HistoryContextValue> = {
    ...context,
    schema: {
      // @ts-expect-error ignore missing properties
      info: {
        singularName: isSingleType ? 'homepage' : 'kitchensink',
      },
    },
  };

  return renderRTL(
    // @ts-expect-error ignore missing properties
    <HistoryProvider {...contextWithSchema}>
      <Routes>
        <Route path={path} element={<VersionHeader headerId="123" />} />
      </Routes>
    </HistoryProvider>,
    { initialEntries: [initialEntry] }
  );
};

describe('VersionHeader', () => {
  describe('collection types', () => {
    // Mocks
    const selectedVersion = {
      id: '26',
      contentType: 'api::kitchensink.kitchensink' as UID.ContentType,
      relatedDocumentId: 'pcwmq3rlmp5w0be3cuplhnpr',
      createdAt: '2022-01-01T00:00:00Z',
      status: 'draft' as const,
      schema: {},
      componentsSchemas: {},
      locale: null,
      data: {
        documentId: '1234',
        id: 1,
        title: 'Test Title',
      },
      meta: {
        unknownAttributes: {
          added: {},
          removed: {},
        },
      },
    };

    it('should display the correct title and subtitle for a non-localized entry', async () => {
      render(
        {
          selectedVersion,
          mainField: 'title',
        },
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history'
      );

      expect(await screen.findByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(await screen.findByText('Test Title (kitchensink)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr'
      );
    });

    it('should display the correct title and subtitle for a localized entry', async () => {
      render(
        {
          selectedVersion: {
            ...selectedVersion,
            locale: {
              code: 'en',
              name: 'English (en)',
            },
          },
          mainField: 'title',
        },
        {
          pathname:
            '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history',
          search: '?plugins[i18n][locale]=en',
        }
      );

      expect(await screen.findByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(
        await screen.findByText('Test Title (kitchensink), in English (en)')
      ).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr?plugins[i18n][locale]=en'
      );
    });

    it('should display the correct subtitle without an entry title (mainField)', async () => {
      render(
        { selectedVersion, mainField: 'plop' },
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history'
      );

      expect(await screen.findByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(await screen.findByText('(kitchensink)')).toBeInTheDocument();
    });
  });

  describe('single types', () => {
    // Mocks
    const selectedVersion = {
      id: '26',
      contentType: 'api::homepage.homepage' as UID.ContentType,
      relatedDocumentId: 'documentid',
      createdAt: '2022-01-01T00:00:00Z',
      status: 'draft' as const,
      schema: {},
      componentsSchemas: {},
      locale: null,
      data: {
        documentId: '1234',
        id: 1,
        title: 'Test Title',
      },
      meta: {
        unknownAttributes: {
          added: {},
          removed: {},
        },
      },
    };

    it('should display the correct title and subtitle for a non-localized entry', async () => {
      render(
        { selectedVersion, mainField: 'title' },
        '/single-types/api::homepage.homepage/history'
      );

      expect(await screen.findByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(await screen.findByText('Test Title (homepage)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute('href', '/single-types/api::homepage.homepage');
    });

    it('should display the correct title and subtitle for a localized entry', async () => {
      render(
        {
          selectedVersion: {
            ...selectedVersion,
            locale: {
              code: 'en',
              name: 'English (en)',
            },
          },
          mainField: 'title',
        },
        {
          pathname: '/single-types/api::homepage.homepage/history',
          search: '?plugins[i18n][locale]=en',
        }
      );

      expect(await screen.findByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(await screen.findByText('Test Title (homepage), in English (en)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/single-types/api::homepage.homepage?plugins[i18n][locale]=en'
      );
    });
  });
});
