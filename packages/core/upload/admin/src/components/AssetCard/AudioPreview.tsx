import React from 'react';

import { Box } from '@strapi/design-system';

interface AudioPreviewProps {
  alt: string;
  url: string;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({ url, alt }) => {
  return (
    <Box>
      <audio controls src={url}>
        {alt}
      </audio>
    </Box>
  );
};
