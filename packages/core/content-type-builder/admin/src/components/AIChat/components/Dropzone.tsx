import { createContext, useCallback, useContext, useEffect } from 'react';

import { Flex, Box, Typography } from '@strapi/design-system';
import { useDropzone } from 'react-dropzone';

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/

interface UseClipboardPasteProps {
  onAddFiles: (files: File[]) => void;
  isEnabled?: boolean;
  accept?: {
    [key: string]: string[];
  };
}

export const useClipboardPasteImages = ({
  onAddFiles,
  isEnabled = false,
}: UseClipboardPasteProps) => {
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!isEnabled) return;
      // Try to get items from clipboard
      const items = e.clipboardData?.items;

      if (!items || items.length === 0) return;

      const files: File[] = [];

      // Process clipboard items
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && file.type.startsWith('image/')) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        onAddFiles(files);
        e.preventDefault(); // Prevent the default paste behavior
      }
    },
    [isEnabled, onAddFiles]
  );

  // Set up the paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);
};

/* -------------------------------------------------------------------------------------------------
 * Dropzone Context
 * -----------------------------------------------------------------------------------------------*/

export interface DropzoneContextValue {
  isEnabled?: boolean;
  isDragActive?: boolean;
  onAddFiles?: (files: File[]) => void;
}

const DropzoneContext = createContext<DropzoneContextValue>({});

export const useDropzoneContext = () => useContext(DropzoneContext);

/* -------------------------------------------------------------------------------------------------
 * Dropzone Root
 * -----------------------------------------------------------------------------------------------*/

export interface DropzoneRootProps extends React.ComponentPropsWithoutRef<typeof Flex> {
  children: React.ReactNode;
  isEnabled?: boolean;
  onAddFiles?: (files: File[]) => void;
  accept?: {
    [key: string]: string[];
  };
}

export const Root = ({
  children,
  isEnabled = true,
  onAddFiles = () => {},
  accept = { 'image/*': [] },
  ...props
}: DropzoneRootProps) => {
  // Use clipboard paste hook for handling clipboard events
  useClipboardPasteImages({ onAddFiles, isEnabled, accept });

  // Use dropzone for drag and drop functionality
  const { getRootProps, isDragActive } = useDropzone({
    onDrop: onAddFiles,
    noClick: true,
    noKeyboard: true,
    accept,
  });

  return (
    <DropzoneContext.Provider
      value={{
        isEnabled,
        isDragActive,
        onAddFiles,
      }}
    >
      <Flex
        direction="column"
        alignItems="flex-start"
        width="100%"
        position="relative"
        {...getRootProps()}
        {...props}
      >
        {children}
      </Flex>
    </DropzoneContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Dropzone Area
 * -----------------------------------------------------------------------------------------------*/

interface DropzoneAreaProps extends React.ComponentPropsWithoutRef<typeof Flex> {
  error?: string | null;
  title?: string;
}

const Area = ({ error, title, ...props }: DropzoneAreaProps) => {
  const { isEnabled, isDragActive } = useDropzoneContext();

  // If not dragging, don't render the dropzone area
  if (!isDragActive) {
    return null;
  }

  const displayTitle = title || 'Drop images here';

  return (
    <Flex
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={2}
      cursor={isEnabled ? 'pointer' : 'not-allowed'}
      width="100%"
      height="100%"
      borderStyle="dashed"
      borderColor={error ? 'danger600' : 'primary500'}
      background={error ? 'danger100' : 'primary100'}
      hasRadius
      padding={7}
      justifyContent="center"
      direction="column"
      alignItems="center"
      gap={2}
      {...props}
    >
      <Box width="24px" height="24px">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.5 13.572L12 6.072L4.5 13.572"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 6.072V20.072"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.9998 20.072H20.0001"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Box>
      <Flex direction="column" alignItems="center" gap={2}>
        <Typography variant="omega" textColor="neutral600" textAlign="center">
          {displayTitle}
        </Typography>
        {error && (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        )}
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Dropzone Compound
 * -----------------------------------------------------------------------------------------------*/

export const Dropzone = {
  Root,
  Area,
  useDropzoneContext,
};
