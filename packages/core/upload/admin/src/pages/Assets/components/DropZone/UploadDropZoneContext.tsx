import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type DropHandler = (files: File[]) => void | Promise<void>;

interface UploadDropZoneContextValue {
  isDragging: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const UploadDropZoneContext = createContext<UploadDropZoneContextValue | null>(null);

/* -------------------------------------------------------------------------------------------------
 * Components
 * -----------------------------------------------------------------------------------------------*/

const DropZoneWrapper = styled(Box)`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface UploadDropZoneProps {
  children: ReactNode;
  onDrop?: DropHandler;
  /**
   * When true, the zone never enters the dragging state and never fires
   * `onDrop` — no overlay, no "drop here" invitation. Used to hide the whole
   * upload affordance from users without `assets.create`, so they don't drag a
   * file onto an inviting target that then silently discards it.
   */
  disabled?: boolean;
}

export const UploadDropZoneProvider = ({
  children,
  onDrop,
  disabled = false,
}: UploadDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const contextValue: UploadDropZoneContextValue = {
    isDragging,
  };

  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragging(false);
      dragCounterRef.current = 0;
    };

    // Handle drag leaving the entire document/window
    const handleDocumentDragLeave = (e: globalThis.DragEvent) => {
      // When relatedTarget is null, we're leaving the document entirely
      if (!e.relatedTarget) {
        setIsDragging(false);
        dragCounterRef.current = 0;
      }
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragleave', handleDocumentDragLeave);

    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('dragleave', handleDocumentDragLeave);
    };
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // No upload permission → never light up the drop target.
      if (disabled) {
        return;
      }

      // Bidirectional guard with AssetsDndProvider — internal item drags must not
      // activate the upload overlay. See AssetsDndProvider.tsx.
      if (!e.dataTransfer.types.includes('Files')) {
        return;
      }

      dragCounterRef.current += 1;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current -= 1;

    // Only set dragging to false if we've left the dropzone completely
    // (counter reaches 0 or negative)
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (disabled) {
        return;
      }

      const { files } = e.dataTransfer;
      if (files?.length && onDrop) {
        onDrop(Array.from(files));
      }
    },
    [onDrop, disabled]
  );

  return (
    <UploadDropZoneContext.Provider value={contextValue}>
      <DropZoneWrapper
        data-testid="assets-dropzone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {children}
      </DropZoneWrapper>
    </UploadDropZoneContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

export const useUploadDropZone = () => {
  const context = useContext(UploadDropZoneContext);

  if (!context) {
    throw new Error('useUploadDropZone must be used within UploadDropZone');
  }

  return {
    isDragging: context.isDragging,
  };
};
