import * as React from 'react';

import { render as renderRTL, screen } from '@tests/utils';

import { type HistoryContextValue, HistoryProvider } from '../../pages/History';
import { VersionHeader } from '../VersionHeader';

import type { UID } from '@strapi/types';

// Mocks
const layout = {
  contentType: {
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

const render = (props: HistoryContextValue) =>
  renderRTL(
    <HistoryProvider {...props}>
      <VersionHeader headerId="123" />
    </HistoryProvider>
  );

describe('VersionHeader', () => {
  it('should display the correct title and subtitle for a non-localized entry', () => {
    render({
      selectedVersion,
      // @ts-expect-error ignore missing properties
      layout,
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Title (kitchensink)')).toBeInTheDocument();
  });

  it('should display the correct title and subtitle for a localized entry', () => {
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
  });

  it('should display the correct subtitle without an entry title (mainField)', () => {
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
