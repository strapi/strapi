import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL, screen, fireEvent, waitFor } from '@testing-library/react';
import { FromUrlForm } from '../FromUrlForm';
import en from '../../../../translations/en.json';
import { server } from './server';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('FromUrlForm', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('snapshots the component with 4 URLs: 3 valid and one in failure', async () => {
    const onAddAssetSpy = jest.fn();

    renderTL(
      <ThemeProvider theme={lightTheme}>
        <FromUrlForm onClose={jest.fn()} onAddAsset={onAddAssetSpy} />
      </ThemeProvider>
    );

    const urls = [
      'http://localhost:5000/an-image.png',
      'http://localhost:5000/a-pdf.pdf',
      'http://localhost:5000/a-video.mp4',
      'http://localhost:5000/not-working-like-cors.lutin',
    ].join('\n');

    fireEvent.change(screen.getByLabelText('URL'), { target: { value: urls } });
    fireEvent.click(screen.getByText('Next'));

    const expectedAssets = [
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
    await waitFor(() => expect(onAddAssetSpy).toHaveBeenCalledWith(expectedAssets));
  });

  it('shows an error message when the asset does not exist', async () => {
    const onAddAssetSpy = jest.fn();

    renderTL(
      <ThemeProvider theme={lightTheme}>
        <FromUrlForm onClose={jest.fn()} onAddAsset={onAddAssetSpy} />
      </ThemeProvider>
    );

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
});
