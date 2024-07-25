import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { VideoPreview } from '../VideoPreview';

describe('VideoPreview', () => {
  it('renders the video element with the correct props', () => {
    const url = 'https://example.com/video.mp4';
    const mime = 'video/mp4';
    const alt = 'Video Preview';

    render(<VideoPreview url={url} mime={mime} alt={alt} />);

    const figureElement = screen.getByRole('figure');
    expect(figureElement).toBeInTheDocument();
  });

  it('renders the visually hidden caption with the correct text', () => {
    const url = 'https://example.com/video.mp4';
    const mime = 'video/mp4';
    const alt = 'Video Preview';

    render(<VideoPreview url={url} mime={mime} alt={alt} />);

    const captionElement = screen.getByText(alt, { hidden: true });
    expect(captionElement).toBeInTheDocument();
  });
});