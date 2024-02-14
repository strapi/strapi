/**
 *
 * Tests for PreviewBox
 *
 */

import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider } from '@strapi/helper-plugin';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import en from '../../../../translations/en.json';
import { PreviewBox } from '../../PreviewBox';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const messageForPlugin = Object.keys(en).reduce((acc, curr) => {
  acc[curr] = `upload.${en[curr]}`;

  return acc;
}, {});

const asset = {
  id: 8,
  name: 'Screenshot 2.png',
  alternativeText: null,
  caption: null,
  width: 1476,
  height: 780,
  formats: {
    thumbnail: {
      name: 'thumbnail_Screenshot 2.png',
      hash: 'thumbnail_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 245,
      height: 129,
      size: 10.7,
      path: null,
      url: '/uploads/thumbnail_Screenshot_2_5d4a574d61.png',
    },
    large: {
      name: 'large_Screenshot 2.png',
      hash: 'large_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 1000,
      height: 528,
      size: 97.1,
      path: null,
      url: '/uploads/large_Screenshot_2_5d4a574d61.png',
    },
    medium: {
      name: 'medium_Screenshot 2.png',
      hash: 'medium_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 750,
      height: 396,
      size: 58.7,
      path: null,
      url: '/uploads/medium_Screenshot_2_5d4a574d61.png',
    },
    small: {
      name: 'small_Screenshot 2.png',
      hash: 'small_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 500,
      height: 264,
      size: 31.06,
      path: null,
      url: '/uploads/small_Screenshot_2_5d4a574d61.png',
    },
  },
  hash: 'Screenshot_2_5d4a574d61',
  ext: '.png',
  mime: 'image/png',
  size: 102.01,
  url: '/uploads/Screenshot_2_5d4a574d61.png',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  createdAt: '2021-10-04T09:42:31.670Z',
  updatedAt: '2021-10-04T09:42:31.670Z',
  isLocal: true,
};

const mockOnCropStart = jest.fn();

const renderCompo = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <TrackingProvider>
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
            <PreviewBox
              asset={asset}
              canUpdate
              canCopyLink
              canDownload
              onDelete={jest.fn()}
              onCropFinish={jest.fn()}
              onCropStart={mockOnCropStart}
              onCropCancel={jest.fn()}
            />
          </IntlProvider>
        </ThemeProvider>
      </TrackingProvider>
    </QueryClientProvider>,
    { container: document.getElementById('app') }
  );

describe('PreviewBox', () => {
  it('renders and matches the snapshot', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });

  it('triggers crop start on click', () => {
    renderCompo();

    const cropButton = screen.getByTestId('crop');
    fireEvent.click(cropButton);
    fireEvent.load(screen.getByTestId('preview'));

    expect(mockOnCropStart).toHaveBeenCalled();
  });

  it('triggers crop start on click and change cropbox dimensions input', () => {
    renderCompo();

    const cropButton = screen.getByTestId('crop');
    fireEvent.click(cropButton);
    fireEvent.load(screen.getByTestId('preview'));

    const heightInput = screen.getByTestId('cropbox-height');
    fireEvent.change(heightInput, { target: { value: '10' } });
    expect(heightInput.value).toBe('10');
    expect(heightInput.value).not.toBe('11');

    const widthInput = screen.getByTestId('cropbox-width');
    fireEvent.change(widthInput, { target: { value: '20' } });
    expect(widthInput.value).toBe('20');
  });
});
