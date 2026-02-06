import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
}

export const UploadDropZoneProvider = ({ children, onDrop }: UploadDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const contextValue: UploadDropZoneContextValue = {
    isDragging,
  };

  useEffect(() => {
    const handleDragEnd = () => setIsDragging(false);
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const related = e.relatedTarget as Node | null;
    if (!related || e.currentTarget.contains(related)) {
      return;
    }

    setIsDragging(false);
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

      const { files } = e.dataTransfer;
      if (files?.length && onDrop) {
        onDrop(Array.from(files));
      }
    },
    [onDrop]
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
