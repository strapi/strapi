import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useUploadDropZone } from './UploadDropZoneContext';

const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

const DropZoneOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => setOpacity(theme.colors.primary200, 0.3)};
  border: 1px solid ${({ theme }) => theme.colors.primary700};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 1;
  pointer-events: none;
`;

const DropZoneWithOverlay = ({ children }: { children: React.ReactNode }) => {
  const { isDragging } = useUploadDropZone();
  return (
    <Box position="relative">
      {isDragging && <DropZoneOverlay />}
      {children}
    </Box>
  );
};

export { DropZoneWithOverlay };
