import * as React from 'react';

import { render as renderRTL, screen } from '@tests/utils';

import { type HistoryContextValue, HistoryProvider } from '../../pages/History';
import { VersionHeader } from '../VersionHeader';

import type { UID } from '@strapi/types';

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
const useParamsMock = jest.fn();
const useQueryParamsMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => useParamsMock(),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: () => useQueryParamsMock(),
}));

const render = (props: HistoryContextValue) =>
  renderRTL(
    <HistoryProvider {...props}>
      <VersionHeader headerId="123" />
    </HistoryProvider>
  );

describe('VersionHeader', () => {
  it('should display the correct title and subtitle for a non-localized entry', () => {
    useParamsMock.mockReturnValue({ collectionType: 'collection-types' });
    useQueryParamsMock.mockReturnValue([{ query: {} }]);

    render({
      selectedVersion,
      // @ts-expect-error ignore missing properties
      layout,
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Title (kitchensink)')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: 'Back' });
    expect(backLink).toHaveAttribute(
      'href',
      '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr'
    );
  });

  it('should display the correct title and subtitle for a localized entry', () => {
    useParamsMock.mockReturnValue({ collectionType: 'collection-types' });
    useQueryParamsMock.mockReturnValue([{ query: { plugins: { i18n: { locale: 'en' } } } }]);

    render({
      selectedVersion: {
        ...selectedVersion,
        locale: {
          code: 'en',
          name: 'English (en)',
        },
      },
      // @ts-expect-error ignore missing properties
      layout,
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Title (kitchensink), in English (en)')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: 'Back' });
    expect(backLink).toHaveAttribute(
      'href',
      '/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr?plugins[i18n][locale]=en'
    );
  });

  it('should display the correct subtitle without an entry title (mainField)', () => {
    useParamsMock.mockReturnValue({ collectionType: 'collection-types' });
    useQueryParamsMock.mockReturnValue([{ query: {} }]);

    render({
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
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('(kitchensink)')).toBeInTheDocument();
  });
});
