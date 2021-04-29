import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import VideoPreview from '..';
import themes from '../../../../../../strapi-admin/admin/src/themes';

jest.mock('react-intl', () => ({
  // eslint-disable-next-line react/prop-types
  FormattedMessage: ({ id }) => <div>{id}</div>,
  useIntl: () => ({
    formatMessage: ({ id }) => id,
  }),
}));

describe('VideoPreview', () => {
  it('shows its initial state with no props', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <VideoPreview />
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('shows a loading state when resolving the asset', () => {
    render(
      <ThemeProvider theme={themes}>
        <VideoPreview
          hasIcon
          previewUrl="https://some-preview-url/img.jpg"
          src="https://something-good/video.mp4"
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('upload.list.assets.loading-asset')).toBeVisible();
  });

  it('shows the thumbnail but not the video when previewURL is passed', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <VideoPreview
          hasIcon
          previewUrl="https://some-preview-url/img.jpg"
          src="https://something-good/video.mp4"
        />
      </ThemeProvider>
    );

    expect(screen.getByAltText('upload.list.assets.preview-asset')).toBeVisible();

    expect(container.querySelector('video')).toBeFalsy();
  });

  it('shows the video when the previewURL is not passed', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <VideoPreview hasIcon src="https://something-good/video.mp4" />
      </ThemeProvider>
    );

    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('shows a fallback message when the video is in error', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <VideoPreview hasIcon src="https://something-good/video.wvf" />
      </ThemeProvider>
    );

    fireEvent(container.querySelector('video'), new Event('error'));

    expect(screen.getByText('upload.list.assets.not-supported-content')).toBeVisible();
  });
});
