import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor } from '@testing-library/react';
import { useQueryParams } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import { AssetDialog } from '..';
import en from '../../../../translations/en.json';
import server from './server';
import { assetResultMock } from './asset.mock';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
}));

jest.mock('../../../../utils/getTrad', () => x => x);

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderML = props =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <AssetDialog {...props} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

describe('AssetDialog', () => {
  let props;
  beforeAll(() => server.listen());

  beforeEach(() => {
    props = {
      onClose: jest.fn(),
      onAddAsset: jest.fn(),
      onValidate: jest.fn(),
      multiple: false,
      initiallySelectedAssets: [],
      canRead: true,
      canCreate: true,
    };
    useQueryParams.mockReturnValue([{ rawQuery: 'some-url' }, jest.fn()]);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      renderML(props);

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });

    it('shows a loader when resolving the assets', () => {
      renderML(props);

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows an empty state when there are no assets and the user is allowed to read and to create', async () => {
        renderML(props);

        await waitFor(() =>
          expect(screen.getByText('Upload your first assets...')).toBeInTheDocument()
        );

        expect(screen.getByRole('button', { name: 'Upload assets' })).toBeInTheDocument();
        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
      });

      it('shows an empty state when there are no assets and the user is allowed to create and NOT to read', async () => {
        props.canRead = false;
        renderML(props);

        await waitFor(() => expect(screen.getByText('Add more assets')).toBeInTheDocument());

        expect(screen.getByRole('button', { name: 'Upload assets' })).toBeInTheDocument();
        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
      });

      it('shows an empty state when there are no assets and the user is allowed to read and NOT to create', async () => {
        props.canCreate = false;
        renderML(props);

        await waitFor(() =>
          expect(screen.getByText('The asset list is empty.')).toBeInTheDocument()
        );

        expect(screen.queryByRole('button', { name: 'Upload assets' })).not.toBeInTheDocument();
        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
      });
    });

    describe('content resolved with canRead = true', () => {
      beforeEach(() => {
        server.use(rest.get('*/upload/files*', (req, res, ctx) => res(ctx.json(assetResultMock))));
      });

      it('shows an asset when the data resolves', async () => {
        renderML(props);

        await waitFor(() => expect(screen.getByText('3874873.jpg')).toBeInTheDocument());

        expect(
          screen.getByText((_, element) => element.textContent === 'jpg - 400✕400')
        ).toBeInTheDocument();
        expect(screen.getByText('Image')).toBeInTheDocument();
      });

      it('shows the add more assets button when authorized to create', async () => {
        props.canCreate = true;
        renderML(props);

        await waitFor(() => expect(screen.getByText(`browse`)).toBeInTheDocument());

        expect(screen.getByText('Add more assets')).toBeInTheDocument();
      });

      it('hides the add more assets button when not authorized to create', async () => {
        props.canCreate = false;
        renderML(props);

        await waitFor(() => expect(screen.getByText(`browse`)).toBeInTheDocument());

        expect(screen.queryByText('Add more assets')).not.toBeInTheDocument();
      });
    });
  });
});
