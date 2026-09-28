import { useCallback, useRef, useState, type DragEvent } from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { PlusCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../utils/translations';

const Zone = styled.button<{ $isDragging: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  width: 100%;
  min-height: 12rem;
  padding: ${({ theme }) => theme.spaces[6]};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral100};
  cursor: pointer;

  // Only while a file is dragged over the zone: it marks where the file will
  // land, so it has nothing to say to a pointer that is merely passing through.
  // Drawn inside rather than on the box itself, so the field keeps its own
  // outline and the invitation reads as an area to drop into.
  &::after {
    content: '';
    position: absolute;
    inset: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[4]};
    border: 1px dashed ${({ theme }) => theme.colors.primary600};
    border-radius: ${({ theme }) => theme.borderRadius};
    opacity: ${({ $isDragging }) => ($isDragging ? 1 : 0)};
    pointer-events: none;
  }

  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

interface AssetDropZoneProps {
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
export const AssetDropZone = ({ disabled = false, onClick, onDropFiles }: AssetDropZoneProps) => {
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
      aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Same treatment as the repeatable-component initializer, so the two
          empty states in a form read as one affordance. */}
      <Flex justifyContent="center" color={disabled ? 'neutral500' : 'primary600'}>
        <PlusCircle width="3.2rem" height="3.2rem" />
      </Flex>
      <Typography textColor="neutral600" fontWeight="bold" variant="pi">
        {formatMessage({
          id: getTranslationKey('content-manager.input.drop-zone.label'),
          defaultMessage: 'Click to add an asset or drag and drop one in this area',
        })}
      </Typography>
    </Zone>
  );
};
