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

interface DragAndDropContextValue {
  isDragging: boolean;
  registerDropHandler: (handler: DropHandler) => void;
  unregisterDropHandler: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const DragAndDropContext = createContext<DragAndDropContextValue | null>(null);

/* -------------------------------------------------------------------------------------------------
 * Components
 * -----------------------------------------------------------------------------------------------*/

const DropZoneWrapper = styled(Box)`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

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

export const DropZoneWithOverlay = ({ children }: { children: React.ReactNode }) => {
  const { isDragging } = useDragAndDrop();
  return (
    <Box position="relative">
      {isDragging && <DropZoneOverlay />}
      {children}
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface DragAndDropProviderProps {
  children: ReactNode;
}

export const DragAndDropProvider = ({ children }: DragAndDropProviderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropHandlerRef = useRef<DropHandler | null>(null);

  const registerDropHandler = useCallback((handler: DropHandler) => {
    dropHandlerRef.current = handler;
  }, []);

  const unregisterDropHandler = useCallback(() => {
    dropHandlerRef.current = null;
  }, []);

  const contextValue: DragAndDropContextValue = {
    isDragging,
    registerDropHandler,
    unregisterDropHandler,
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

  const handleDrop = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const { files } = e.dataTransfer;
    if (files?.length && dropHandlerRef.current) {
      dropHandlerRef.current(Array.from(files));
    }
  }, []);

  return (
    <DragAndDropContext.Provider value={contextValue}>
      <DropZoneWrapper
        data-testid="assets-dropzone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {children}
      </DropZoneWrapper>
    </DragAndDropContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

export const useDragAndDrop = (onDrop?: DropHandler) => {
  const context = useContext(DragAndDropContext);

  if (!context) {
    throw new Error('useDragAndDrop must be used within DragAndDropProvider');
  }

  useEffect(() => {
    if (!onDrop) return;

    context.registerDropHandler(onDrop);
    return () => context.unregisterDropHandler();
  }, [context, onDrop]);

  return {
    isDragging: context.isDragging,
  };
};
