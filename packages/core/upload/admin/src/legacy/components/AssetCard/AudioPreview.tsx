/* eslint-disable jsx-a11y/media-has-caption */
import { Box } from '@strapi/design-system';

interface AudioPreviewProps {
  alt: string;
  url: string;
}

export const AudioPreview = ({ url, alt }: AudioPreviewProps) => {
  return (
    <Box>
      <audio controls src={url}>
        {alt}
      </audio>
    </Box>
  );
};
