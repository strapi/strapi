import * as React from 'react';

import { RenderOptions, render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { type HistoryContextValue, HistoryProvider } from '../../pages/History';
import { VersionHeader } from '../VersionHeader';

import type { UID } from '@strapi/types';

const render = (
  props: HistoryContextValue,
  initialEntry: Exclude<RenderOptions['initialEntries'], undefined>[number]
) => {
  const path =
    props.layout.contentType.kind === 'singleType'
      ? '/:singleType/:slug/history'
      : '/:collectionType/:slug/:id/history';

  return renderRTL(
    <HistoryProvider {...props}>
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
    const layout = {
      contentType: {
        kind: 'collectionType',
        info: {
          singularName: 'kitchensink',
        },
        settings: {
          mainField: 'title',
        },
      },
    };
    const selectedVersion = {
      id: '26',
      contentType: 'api::kitchensink.kitchensink' as UID.ContentType,
      relatedDocumentId: 'pcwmq3rlmp5w0be3cuplhnpr',
      createdAt: '2022-01-01T00:00:00Z',
      status: 'draft' as const,
      schema: {},
      locale: null,
      data: {
        title: 'Test Title',
      },
    };

    it('should display the correct title and subtitle for a non-localized entry', () => {
      render(
        {
          selectedVersion,
          // @ts-expect-error ignore missing properties
          layout,
        },
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history'
      );

      expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Test Title (kitchensink)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr'
      );
    });

    it('should display the correct title and subtitle for a localized entry', () => {
      render(
        {
          selectedVersion: {
            ...selectedVersion,
            locale: {
              code: 'en',
              name: 'English (en)',
            },
          },
          // @ts-expect-error ignore missing properties
          layout,
        },
        {
          pathname:
            '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history',
          search: '?plugins[i18n][locale]=en',
        }
      );

      expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Test Title (kitchensink), in English (en)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr?plugins[i18n][locale]=en'
      );
    });

    it('should display the correct subtitle without an entry title (mainField)', () => {
      render(
        {
          selectedVersion,
          layout: {
            ...layout,
            contentType: {
              ...layout.contentType,
              // @ts-expect-error ignore missing properties
              settings: {
                ...layout.contentType.settings,
                mainField: 'id', // id or null does will not return a value from version.data
              },
            },
          },
        },
        '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history'
      );

      expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('(kitchensink)')).toBeInTheDocument();
    });
  });

  describe('single types', () => {
    // Mocks
    const layout = {
      contentType: {
        kind: 'singleType',
        info: {
          singularName: 'homepage',
        },
        settings: {
          mainField: 'title',
        },
      },
    };
    const selectedVersion = {
      id: '26',
      contentType: 'api::homepage.homepage' as UID.ContentType,
      relatedDocumentId: 'documentid',
      createdAt: '2022-01-01T00:00:00Z',
      status: 'draft' as const,
      schema: {},
      locale: null,
      data: {
        title: 'Test Title',
      },
    };

    it('should display the correct title and subtitle for a non-localized entry', () => {
      render(
        {
          selectedVersion,
          // @ts-expect-error ignore missing properties
          layout,
        },
        '/single-types/api::homepage.homepage/history'
      );

      expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Test Title (homepage)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute('href', '/single-types/api::homepage.homepage');
    });

    it('should display the correct title and subtitle for a localized entry', () => {
      render(
        {
          selectedVersion: {
            ...selectedVersion,
            locale: {
              code: 'en',
              name: 'English (en)',
            },
          },
          // @ts-expect-error ignore missing properties
          layout,
        },
        {
          pathname: '/single-types/api::homepage.homepage/history',
          search: '?plugins[i18n][locale]=en',
        }
      );

      expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Test Title (homepage), in English (en)')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: 'Back' });
      expect(backLink).toHaveAttribute(
        'href',
        '/single-types/api::homepage.homepage?plugins[i18n][locale]=en'
      );
    });
  });
});
