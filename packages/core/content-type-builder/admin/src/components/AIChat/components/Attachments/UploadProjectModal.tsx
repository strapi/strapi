import { useRef, useState } from 'react';

import { Flex, Button, Typography, Modal, Box } from '@strapi/design-system';

import { useAttachments } from '../../hooks/useAttachments';

import { NextLogo } from './components/NextLogo';
import { useZipUpload } from './hooks/useZipUpload';
import { ProjectAttachment } from './ProjectAttachment';

interface DropZoneProps {
  onAddFiles: (files: FileList | File[]) => void;
  error?: string | null;
}

const DropZone = ({ onAddFiles, error }: DropZoneProps) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    inputRef.current?.click();
  };

  const handleChange = () => {
    const files = inputRef.current?.files;
    if (files) {
      onAddFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e?.dataTransfer?.files) {
      onAddFiles(e.dataTransfer.files);
    }
    setDragOver(false);
  };

  return (
    <Flex
      position="relative"
      cursor="pointer"
      width="100%"
      borderStyle="dashed"
      borderColor={dragOver ? 'primary500' : error ? 'danger600' : 'neutral200'}
      background={dragOver ? 'primary100' : error ? 'danger100' : 'neutral100'}
      hasRadius
      padding={7}
      justifyContent="center"
      direction="column"
      alignItems="center"
      gap={3}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <NextLogo size={36} />
      <Flex direction="column" alignItems="center" gap={2}>
        <Typography variant="omega" textColor="neutral600">
          Drop .zip file here or{' '}
          <Typography variant="omega" textColor="primary600" onClick={handleClick}>
            browse files
          </Typography>
        </Typography>
        {error && (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        )}
      </Flex>
      <Box
        tag="input"
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        top={0}
        width="100%"
        type="file"
        name="code"
        aria-label="Upload project"
        tabIndex={-1}
        zIndex={1}
        ref={inputRef}
        onChange={handleChange}
        style={{ opacity: 0, cursor: 'pointer' }}
        accept=".zip"
      />
    </Flex>
  );
};

interface NextModalProps {
  onClose?: () => void;
  onFinish?: (file: File, projectName: string) => void;
}

export const NextModal = ({ onClose }: NextModalProps) => {
  // Processed file
  const [projectName, setFileName] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // Attach files to the chat
  const { attachFiles } = useAttachments();

  const { processFile, isLoading, error } = useZipUpload({
    onSuccess: (file) => setUploadedFile(file),
    onError: (err) => {
      // console.log('onError', err);
    },
  });

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="omega" fontWeight={'bold'}>
            Upload file
          </Typography>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" gap={6} alignItems="flex-start">
            <Flex direction="column" gap={2} alignItems="flex-start">
              <Typography variant="beta">Upload a Next.js app</Typography>
              <Typography variant="omega" textColor="neutral600">
                Drop your Next.js project files here or browse to upload. Strapi AI will analyze
                your project and help you create the appropriate schemas.
              </Typography>
            </Flex>
            {projectName ? (
              <Box paddingTop={4}>
                <ProjectAttachment
                  name={projectName}
                  loading={isLoading}
                  onRemove={() => {
                    setFileName(null);
                    setUploadedFile(null);
                  }}
                />
              </Box>
            ) : (
              <DropZone
                onAddFiles={(files: FileList | File[]) => {
                  const file = files[0];
                  setFileName(file.name.replace('.zip', ''));
                  processFile(file);
                }}
                error={error}
              />
            )}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
          </Modal.Close>
          {uploadedFile ? (
            <Button
              variant="default"
              onClick={() => {
                if (uploadedFile) {
                  attachFiles([uploadedFile]);
                }
                onClose?.();
              }}
            >
              Finish
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
