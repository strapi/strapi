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

type DragState = 'idle' | 'accept' | 'reject';

const DRAG_FRAME_COLORS = {
  accept: { border: 'primary600', background: 'primary100' },
  reject: { border: 'neutral300', background: 'neutral150' },
} as const;

const Zone = styled.div<{ $dragState: DragState; $variant: ZoneVariant }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[4]};
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius};
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

  // Only while a file is dragged over the zone: a solid frame inset from the
  // zone's own border marks where the file will land, greyed out when it can't.
  ${({ $dragState, theme }) =>
    $dragState !== 'idle' &&
    `
    &::after {
      content: '';
      position: absolute;
      inset: ${theme.spaces[2]};
      border: 1px solid ${theme.colors[DRAG_FRAME_COLORS[$dragState].border]};
      border-radius: ${theme.borderRadius};
      background: ${theme.colors[DRAG_FRAME_COLORS[$dragState].background]};
      pointer-events: none;
    }

    & > * {
      z-index: 1;
    }
  `}

  &[data-disabled='true'] {
    cursor: not-allowed;
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
  onDropFiles: (files: globalThis.File[]) => void;
}

/**
 * The field's own drop target. It only takes drops: browsing and picking files
 * go through the "Add asset" menu, so the field has one way in, not two.
 *
 * Deliberately not the Media Library page's
 * `UploadDropZoneProvider`: that one covers a whole route and paints a
 * full-surface overlay, where this has to stay inside one field on a form that
 * may hold several of them.
 */
export const AssetDropZone = ({
  variant = 'bar',
  disabled = false,
  onDropFiles,
}: AssetDropZoneProps) => {
  const { formatMessage } = useIntl();
  const [isDragging, setIsDragging] = useState(false);
  // Drag events fire on descendants too, so a plain boolean flickers as the
  // pointer crosses the icon or the label. Counting enter/leave pairs doesn't.
  const dragDepth = useRef(0);

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      // `none` shows the no-drop cursor, and the browser then fires no `drop`.
      event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    },
    [disabled]
  );

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
      $dragState={isDragging ? (disabled ? 'reject' : 'accept') : 'idle'}
      $variant={variant}
      data-disabled={disabled}
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
