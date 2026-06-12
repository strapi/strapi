import { useState } from 'react';

import { Grid } from '@strapi/design-system';

import { FigmaImage } from '../hooks/useFigmaUpload';

import { ImagePreview } from './ImagePreview';

interface ImagePreviewGroupProps {
  images: FigmaImage[];
  onSelectionChange?: (selectedFrames: string[]) => void;
}

export const ImagePreviewGroup = ({ images, onSelectionChange }: ImagePreviewGroupProps) => {
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);

  const handleFrameSelection = (frameId: string) => {
    setSelectedFrames((prev) => {
      const newSelection = prev.includes(frameId)
        ? prev.filter((id) => id !== frameId)
        : [...prev, frameId];

      onSelectionChange?.(newSelection);
      return newSelection;
    });
  };

  return (
    <Grid.Root gap={4}>
      {images.map((frame, index) => {
        const isSelected = selectedFrames.includes(frame.id);
        return (
          <Grid.Item key={frame.id} col={6} xs={12} padding={'1px'}>
            <ImagePreview
              imageUrl={frame.url}
              imageName={frame.filename || `Frame ${index + 1}`}
              selected={isSelected}
              onSelect={() => handleFrameSelection(frame.id)}
            />
          </Grid.Item>
        );
      })}
    </Grid.Root>
  );
};
