import { useCallback, useRef, useState, type DragEvent } from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { Images } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../utils/translations';

/**
 * `bar` on an empty field, `tile` after a multiple field's cards, `stacked`
 * below them when the field is too narrow for both on one row.
 */
export type ZoneVariant = 'bar' | 'tile' | 'stacked';

const Zone = styled.button<{ $isDragging: boolean; $variant: ZoneVariant }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[4]};
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  text-align: ${({ $variant }) => ($variant === 'bar' ? 'start' : 'center')};

  ${({ $variant, theme }) =>
    $variant !== 'bar'
      ? `
    flex-direction: column;
    justify-content: center;
    height: 100%;
    min-height: ${$variant === 'tile' ? '20.8rem' : 'auto'};
    padding: ${theme.spaces[4]};
    border: 1px dashed ${theme.colors.neutral300};
    background: ${theme.colors.neutral0};
  `
      : `
    min-height: 7.2rem;
    padding: ${theme.spaces[4]};
    border: 1px solid ${theme.colors.neutral200};
    background: ${theme.colors.neutral100};
  `}

  // Only while a file is dragged over the zone: it marks where the file will land.
  ${({ $isDragging, theme }) =>
    $isDragging &&
    `
    border: 1px dashed ${theme.colors.primary600};
    background: ${theme.colors.primary100};
  `}

  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

const IconFrame = styled(Flex)`
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral200};
  color: ${({ theme }) => theme.colors.neutral500};
`;

interface AssetDropZoneProps {
  variant?: ZoneVariant;
  disabled?: boolean;
  onClick: () => void;
  onDropFiles: (files: globalThis.File[]) => void;
}

/**
 * The field's own drop target. Deliberately not the Media Library page's
 * `UploadDropZoneProvider`: that one covers a whole route and paints a
 * full-surface overlay, where this has to stay inside one field on a form that
 * may hold several of them.
 */
export const AssetDropZone = ({
  variant = 'bar',
  disabled = false,
  onClick,
  onDropFiles,
}: AssetDropZoneProps) => {
  const { formatMessage } = useIntl();
  const [isDragging, setIsDragging] = useState(false);
  // Drag events fire on descendants too, so a plain boolean flickers as the
  // pointer crosses the icon or the label. Counting enter/leave pairs doesn't.
  const dragDepth = useRef(0);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (disabled || !event.dataTransfer.types.includes('Files')) {
        return;
      }
      dragDepth.current += 1;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length > 0) {
        onDropFiles(files);
      }
    },
    [disabled, onDropFiles]
  );

  return (
    <Zone
      type="button"
      $isDragging={isDragging}
      $variant={variant}
      aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <IconFrame justifyContent="center" alignItems="center">
        <Images width="2.4rem" height="2.4rem" />
      </IconFrame>
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslationKey('content-manager.input.placeholder'),
          defaultMessage: 'Drag & drop an asset here',
        })}
      </Typography>
    </Zone>
  );
};
