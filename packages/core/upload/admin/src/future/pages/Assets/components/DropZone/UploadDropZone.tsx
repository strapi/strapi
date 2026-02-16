import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../../utils/translations';

import { useUploadDropZone } from './UploadDropZoneContext';

/* -------------------------------------------------------------------------------------------------
 * DropZoneOverlay
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * DropZoneMessage
 * -----------------------------------------------------------------------------------------------*/

const DropFilesMessageImpl = styled(Box)<{ $leftContentWidth: number }>`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[8]};
  left: 50%;
  transform: translateX(calc(-50% + ${({ $leftContentWidth }) => $leftContentWidth / 2}px));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  background: ${({ theme }) => theme.colors.primary600};
  padding: ${({ theme }) => theme.spaces[4]} ${({ theme }) => theme.spaces[6]};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 2;
`;

interface DropFilesMessageProps {
  uploadDropZoneRef?: React.RefObject<HTMLDivElement>;
}

const DropFilesMessage = ({ uploadDropZoneRef }: DropFilesMessageProps) => {
  const { formatMessage } = useIntl();
  const { isDragging } = useUploadDropZone();

  // Dropzone message position (relative to main content)
  const [leftContentWidth, setLeftContentWidth] = React.useState(0);

  // Calculate the left content width to position the dropzone message correctly
  React.useEffect(() => {
    if (!uploadDropZoneRef?.current) return;

    const updateRect = () => {
      const rect = uploadDropZoneRef.current?.getBoundingClientRect();
      if (rect) {
        setLeftContentWidth((prev) => (prev !== rect.left ? rect.left : prev));
      }
    };

    updateRect();
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(uploadDropZoneRef.current);
    return () => resizeObserver.disconnect();
  }, [uploadDropZoneRef]);

  if (!isDragging) return null;

  return (
    <DropFilesMessageImpl $leftContentWidth={leftContentWidth}>
      <Typography textColor="neutral0">
        {formatMessage({
          id: getTranslationKey('dropzone.upload.message'),
          defaultMessage: 'Drop here to upload to',
        })}
      </Typography>
      <Flex gap={2} alignItems="center">
        <Folder width={20} height={20} fill="neutral0" />
        <Typography textColor="neutral0" fontWeight="semiBold">
          Current folder{/* TODO: Replace this later with the current folder name */}
        </Typography>
      </Flex>
    </DropFilesMessageImpl>
  );
};

export { DropZoneWithOverlay, DropFilesMessage };
