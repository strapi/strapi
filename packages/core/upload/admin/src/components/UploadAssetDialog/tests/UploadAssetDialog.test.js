import React from 'react';
import { render as renderTL, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import en from '../../../translations/en.json';
import { UploadAssetDialog } from '../UploadAssetDialog';
import { server } from './server';

jest.mock('../../../utils/getTrad', () => x => x);

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const render = (props = { onClose: () => {} }) =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <UploadAssetDialog {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
    { container: document.getElementById('app') }
  );

describe('UploadAssetDialog', () => {
  let confirmSpy;
  beforeAll(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
    server.listen();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => {
    confirmSpy.mockRestore();
    server.close();
  });

  describe('from computer', () => {
    it('snapshots the component', () => {
      render();

      expect(document.body).toMatchSnapshot();
    });

    it('closes the dialog when clicking on cancel on the add asset step', () => {
      const onCloseSpy = jest.fn();
      render({ onClose: onCloseSpy, onSuccess: () => {} });

      fireEvent.click(screen.getByText('app.components.Button.cancel'));

      expect(onCloseSpy).toBeCalled();
    });

    it('open confirm box when clicking on cancel on the pending asset step', () => {
      const file = new File(['Some stuff'], 'test.png', { type: 'image/png' });
      const onCloseSpy = jest.fn();

      render({ onClose: onCloseSpy, onSuccess: () => {} });

      const fileList = [file];
      fileList.item = i => fileList[i];

      fireEvent.change(document.querySelector('[type="file"]'), { target: { files: fileList } });
      fireEvent.click(screen.getByText('app.components.Button.cancel'));

      expect(window.confirm).toBeCalled();
    });

    [
      ['png', 'image/png', 'Image', 1],
      ['mp4', 'video/mp4', 'Video', 2],
      ['pdf', 'application/pdf', 'Doc', 1],
      ['unknown', 'unknown', 'Doc', 1],
    ].forEach(([ext, mime, assetType, number]) => {
      it(`shows ${number} valid ${mime} file`, () => {
        const onCloseSpy = jest.fn();

        // see https://github.com/testing-library/react-testing-library/issues/470
        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
          set: () => {},
        });

        const file = new File(['Some stuff'], `test.${ext}`, { type: mime });

        const fileList = [file];
        fileList.item = i => fileList[i];

        render({ onClose: onCloseSpy, onSuccess: () => {} });

        fireEvent.change(document.querySelector('[type="file"]'), {
          target: { files: fileList },
        });

        expect(screen.getAllByText(`Add new assets`).length).toBe(2);
        expect(
          screen.getByText(
            '{number, plural, =0 {No asset} one {1 asset} other {# assets}} ready to upload'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText('Manage the assets before adding them to the Media Library')
        ).toBeInTheDocument();
        expect(screen.getAllByText(`test.${ext}`).length).toBe(number);
        expect(screen.getByText(ext)).toBeInTheDocument();
        expect(screen.getByText(assetType)).toBeInTheDocument();
      });
    });
  });

  describe('from url', () => {
    it('snapshots the component', () => {
      render();

      fireEvent.click(screen.getByText('From url'));

      expect(document.body).toMatchSnapshot();
    });

    it('shows an error message when the asset does not exist', async () => {
      render();
      fireEvent.click(screen.getByText('From url'));

      const urls = [
        'http://localhost:5000/an-image.png',
        'http://localhost:5000/a-pdf.pdf',
        'http://localhost:5000/a-video.mp4',
        'http://localhost:5000/not-working-like-cors.lutin',
        'http://localhost:1234/some-where-not-existing.jpg',
      ].join('\n');

      fireEvent.change(screen.getByLabelText('URL'), { target: { value: urls } });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => expect(screen.getByText('Network Error')).toBeInTheDocument());
    });

    it('snapshots the component with 4 URLs: 3 valid and one in failure', async () => {
      render();
      fireEvent.click(screen.getByText('From url'));

      const urls = [
        'http://localhost:5000/an-image.png',
        'http://localhost:5000/a-pdf.pdf',
        'http://localhost:5000/a-video.mp4',
        'http://localhost:5000/not-working-like-cors.lutin',
      ].join('\n');

      fireEvent.change(screen.getByLabelText('URL'), { target: { value: urls } });
      fireEvent.click(screen.getByText('Next'));

      const assets = [
        {
          name: 'http://localhost:5000/an-image.png',
          ext: 'png',
          mime: 'image/png',
          source: 'url',
          type: 'image',
          url: 'http://localhost:5000/an-image.png',
          rawFile: new File([''], 'image/png'),
        },
        {
          name: 'http://localhost:5000/a-pdf.pdf',
          ext: 'pdf',
          mime: 'application/pdf',
          source: 'url',
          type: 'doc',
          url: 'http://localhost:5000/a-pdf.pdf',
          rawFile: new File([''], 'application/pdf'),
        },
        {
          name: 'http://localhost:5000/a-video.mp4',
          ext: 'mp4',
          mime: 'video/mp4',
          source: 'url',
          type: 'video',
          url: 'http://localhost:5000/a-video.mp4',
          rawFile: new File([''], 'video/mp4'),
        },
        {
          name: 'http://localhost:5000/not-working-like-cors.lutin',
          ext: 'lutin',
          mime: 'application/json',
          source: 'url',
          type: 'doc',
          url: 'http://localhost:5000/not-working-like-cors.lutin',
          rawFile: new File([''], 'something/weird'),
        },
      ];

      await waitFor(() =>
        expect(
          screen.getByText(
            '{number, plural, =0 {No asset} one {1 asset} other {# assets}} ready to upload'
          )
        ).toBeInTheDocument()
      );
      expect(screen.getAllByText(`Add new assets`).length).toBe(2);
      expect(
        screen.getByText('Manage the assets before adding them to the Media Library')
      ).toBeInTheDocument();

      assets.forEach(asset => {
        const dialog = within(screen.getByRole('dialog'));
        const card = within(dialog.getAllByLabelText(asset.name)[0]);

        expect(card.getByText(asset.ext)).toBeInTheDocument();
        expect(
          card.getByText(asset.type.charAt(0).toUpperCase() + asset.type.slice(1))
        ).toBeInTheDocument();
      });
    });
  });
});
