import React from 'react';

import { UID } from '@strapi/types';
import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { VersionHeader } from '../VersionHeader';

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
const version = {
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

const render = (props: React.ComponentProps<typeof VersionHeader>) =>
  renderRTL(
    <Routes>
      <Route
        path="/content-manager/:collectionType/:slug/:id/history"
        element={<VersionHeader {...props} />}
      />
    </Routes>,
    {
      renderOptions: {
        wrapper({ children }) {
          return <>{children}</>;
        },
      },
      initialEntries: [
        '/content-manager/collection-types/api::kitchensink.kitchensink/pcwmq3rlmp5w0be3cuplhnpr/history?id=26',
      ],
    }
  );

describe('VersionHeader', () => {
  it('should display the correct title and subtitle for a non-localized entry', () => {
    render({
      version,
      headerId: '123',
      // @ts-expect-error ignore missing properties
      layout,
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Title (kitchensink)')).toBeInTheDocument();
  });

  it('should display the correct title and subtitle for a localized entry', () => {
    render({
      version: {
        ...version,
        locale: {
          code: 'en',
          name: 'English (en)',
        },
      },
      headerId: '123',
      // @ts-expect-error ignore missing properties
      layout,
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Title (kitchensink), in English (en)')).toBeInTheDocument();
  });

  it('should display a title but not a subtitle', () => {
    render({
      version,
      headerId: '123',
      layout: {
        ...layout,
        contentType: {
          ...layout.contentType,
          // @ts-expect-error ignore missing properties
          settings: {
            ...layout.contentType.settings,
            mainField: 'id', // id or null do not return a subtitle
          },
        },
      },
    });

    expect(screen.getByText('1/1/2022, 12:00 AM')).toBeInTheDocument();
    expect(screen.queryByText('Test Title (kitchensink)')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Title (kitchensink), in English (en)')).not.toBeInTheDocument();
  });
});
