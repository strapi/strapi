import { createContext, useContext, useRef, useState } from 'react';

import { Flex, Typography, Box } from '@strapi/design-system';
import { Folder, FileZip } from '@strapi/icons';

import { AttachmentPreview } from './components/Attachments/AttachmentPreview';
import { StepModal, useStepModal } from './components/StepModal';
import { useAttachments } from './hooks/useAttachments';
import { useCodeUpload } from './hooks/useCodeUpload';
import { useTranslations } from './hooks/useTranslations';
import { STRAPI_CODE_MIME_TYPE } from './lib/constants';
import { generateId } from './lib/misc';
import { Attachment } from './lib/types/attachments';
import { useStrapiChat } from './providers/ChatProvider';

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/
interface UploadProjectContextType {
  isCodeUploadOpen: boolean;
  submitOnFinish: boolean;
  openCodeUpload: (submitOnFinish?: boolean) => void;
  closeCodeUpload: () => void;
}

const UploadProjectContext = createContext<UploadProjectContextType>({
  isCodeUploadOpen: false,
  submitOnFinish: false,
  openCodeUpload: () => {},
  closeCodeUpload: () => {},
});

export const useUploadProjectToChat = () => useContext(UploadProjectContext);

export const UploadProjectToChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCodeUploadOpen, setIsCodeUploadOpen] = useState(false);
  const [submitOnFinish, setSubmitOnFinish] = useState(false);

  const openCodeUpload = (submitOnFinish?: boolean) => {
    setIsCodeUploadOpen(true);
    setSubmitOnFinish(submitOnFinish ?? false);
  };

  const closeCodeUpload = () => setIsCodeUploadOpen(false);

  return (
    <UploadProjectContext.Provider
      value={{ isCodeUploadOpen, submitOnFinish, openCodeUpload, closeCodeUpload }}
    >
      {isCodeUploadOpen && <UploadCodeModal />}
      {children}
    </UploadProjectContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Drop Zone
 * -----------------------------------------------------------------------------------------------*/
interface DropZoneProps {
  importType: 'folder' | 'zip';
  onAddFiles: (files: File[]) => void;
  error?: string | null;
}

const DropZone = ({ importType, onAddFiles, error }: DropZoneProps) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslations();

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
      onAddFiles(Array.from(files));
    }
  };

  /**
   * Recursively reads a directory and its contents
   */
  const readDirectory = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
    const reader = entry.createReader();
    const getEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    const files: File[] = [];
    let entries: FileSystemEntry[] = [];

    // Read entries in batches until no more entries are left
    do {
      entries = await getEntries();
      for (const entry of entries) {
        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });

          // Store the full path including the directory structure
          Object.defineProperty(file, 'webkitRelativePath', {
            writable: true,
            value: entry.fullPath.substring(1), // Remove leading slash
          });

          files.push(file);
        } else if (entry.isDirectory) {
          // Recursively process subdirectories
          const dirEntry = entry as FileSystemDirectoryEntry;
          const subFiles = await readDirectory(dirEntry);
          files.push(...subFiles);
        }
      }
    } while (entries.length > 0);

    return files;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (!e.dataTransfer?.items) {
      return;
    }

    // For folder upload, process directories recursively
    if (importType === 'folder') {
      const items = e.dataTransfer.items;
      const allFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Use webkitGetAsEntry to access the file system entry
        const entry = item.webkitGetAsEntry?.();

        if (entry) {
          if (entry.isDirectory) {
            const files = await readDirectory(entry as FileSystemDirectoryEntry);
            allFiles.push(...files);
          } else if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => {
              (entry as FileSystemFileEntry).file(resolve, reject);
            });
            allFiles.push(file);
          }
        }
      }

      if (allFiles.length > 0) {
        onAddFiles(allFiles);
      }
    } else {
      // For zip files, just import them regularly
      if (e.dataTransfer.files) {
        onAddFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  return (
    <Flex
      position="relative"
      cursor="pointer"
      width="100%"
      height="100%"
      minHeight="140px"
      borderStyle="dashed"
      borderColor={dragOver ? 'primary500' : error ? 'danger600' : 'neutral200'}
      background={dragOver ? 'primary100' : error ? 'danger100' : 'neutral100'}
      hasRadius
      padding={7}
      justifyContent="center"
      direction="column"
      alignItems="center"
      gap={2}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {importType === 'zip' ? (
        <FileZip width={'24px'} height={'24px'} />
      ) : (
        <Folder width={'24px'} height={'24px'} />
      )}
      <Flex direction="column" alignItems="center" gap={2}>
        <Typography variant="omega" textColor="neutral600" textAlign="center">
          {importType === 'zip'
            ? t('chat.code-upload.drop-zone', 'Drop here a .zip file here or')
            : t('chat.code-upload.drop-zone-folder', 'Drop here a folder here or')}{' '}
          <Typography variant="omega" textColor="primary600" onClick={handleClick}>
            {t('chat.code-upload.drop-zone-browse', 'browse files')}
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
        name="code"
        aria-label="Upload project"
        tabIndex={-1}
        zIndex={1}
        ref={inputRef}
        onChange={handleChange}
        style={{ opacity: 0, cursor: 'pointer' }}
        type="file"
        {...(importType === 'zip'
          ? { accept: '.zip', multiple: false }
          : { multiple: true, webkitdirectory: '', directory: '' })}
      />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step 1 - Upload Code
 * -----------------------------------------------------------------------------------------------*/
interface CodeUploadStepProps {
  setFileName: (name: string | null) => void;
  error: string | null;
  processZipFile: (file: File) => void;
  processFolder: (files: File[]) => Promise<Attachment>;
}

const CodeUploadStep = ({
  setFileName,
  error,
  processZipFile,
  processFolder,
}: CodeUploadStepProps) => {
  const { t } = useTranslations();
  const { nextStep } = useStepModal();

  return (
    <Flex direction="column" gap={6} alignItems="start" width="100%">
      <Flex direction="column" gap={2} alignItems="start">
        <Typography variant="beta">{t('chat.code-upload.title', 'Import code')}</Typography>
        <Typography variant="omega" textColor="neutral600">
          {t(
            'chat.code-upload.description',
            'Your app will be analyzed by AI. Make sure to remove all sensitive data before importation.'
          )}
        </Typography>
      </Flex>

      <Flex gap={3} width="100%" wrap="wrap">
        <Box flex={1} minWidth="200px">
          <DropZone
            importType="zip"
            onAddFiles={(files: FileList | File[]) => {
              if (files.length > 0) {
                const file = files[0];
                setFileName(file.name.replace('.zip', ''));
                nextStep();
                processZipFile(file);
              }
            }}
            error={error}
          />
        </Box>
        <Box flex={1} minWidth="200px">
          <DropZone
            importType="folder"
            onAddFiles={async (files: File[]) => {
              if (files.length > 0) {
                try {
                  // Get the folder name from the first file's path
                  const firstFile = files[0];
                  const folderPath = firstFile.webkitRelativePath || '';
                  const folderName = folderPath.split('/')[0] || 'Project';

                  setFileName(folderName);
                  nextStep();

                  // Process the folder files
                  await processFolder(files);
                } catch (err) {
                  console.error('Error processing folder:', err);
                }
              }
            }}
            error={error}
          />
        </Box>
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step 2 - Confirmation
 * -----------------------------------------------------------------------------------------------*/
interface CodeConfirmationStepProps {
  projectName: string | null;
  isLoading: boolean;
  error: string | null;
}

const CodeConfirmationStep = ({ projectName, isLoading, error }: CodeConfirmationStepProps) => {
  const { t } = useTranslations();

  return (
    <Flex direction="column" gap={6} alignItems="start" width="100%">
      <Flex direction="column" gap={2} alignItems="start">
        <Typography variant="beta">
          {t('chat.code-upload.confirmation-title', 'Confirm Code Import')}
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          {t(
            'chat.code-upload.confirmation-description',
            'Your code is ready to be imported. Click finish to add it to your chat.'
          )}
        </Typography>
      </Flex>

      <Box width="100%">
        <AttachmentPreview
          attachment={{
            id: generateId(),
            status: isLoading ? 'loading' : 'ready',
            filename: projectName || '',
            url: '',
            type: 'file',
            mediaType: STRAPI_CODE_MIME_TYPE,
          }}
          error={error}
          minWidth="256px"
        />
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Modal
 * -----------------------------------------------------------------------------------------------*/
export const UploadCodeModal = () => {
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectAttachment, setProjectAttachment] = useState<Attachment | null>(null);
  const { t } = useTranslations();

  // Attach files to the chat
  const { addAttachments } = useAttachments();

  const { processZipFile, processFolder, isLoading, error } = useCodeUpload({
    onSuccess: (file) => setProjectAttachment(file),
  });

  const { isCodeUploadOpen, closeCodeUpload, submitOnFinish } = useUploadProjectToChat();
  const { sendMessage, openChat, input, setInput } = useStrapiChat();

  const handleCancel = () => {
    setProjectName(null);
    setProjectAttachment(null);
    closeCodeUpload();
  };

  const handleComplete = async () => {
    // Ensure chat is opened
    openChat();

    if (projectAttachment && submitOnFinish) {
      sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Create schemas from my uploaded project',
          },
          projectAttachment,
        ],
      });
    } else if (projectAttachment) {
      // If input is empty, set a predefined message
      if (!input) {
        setInput('Create schemas from my uploaded project');
      }
      // Attach files to the chat input
      addAttachments([projectAttachment]);
    }

    closeCodeUpload();
  };

  const validateUploadStep = () => {
    return !!projectAttachment;
  };

  return (
    <StepModal
      open={isCodeUploadOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}
      title={t('chat.code-upload.header', 'Import code')}
      onCancel={handleCancel}
      onComplete={handleComplete}
    >
      <StepModal.Step
        title={t('chat.code-upload.step1-title', 'Import code')}
        nextLabel={t('chat.code-upload.continue-button', 'Continue')}
        cancelLabel={t('common.cancel', 'Cancel')}
        disableNext={!projectAttachment || isLoading}
        onNext={validateUploadStep}
      >
        <CodeUploadStep
          setFileName={setProjectName}
          error={error}
          processZipFile={processZipFile}
          processFolder={processFolder}
        />
      </StepModal.Step>

      <StepModal.Step
        title={t('chat.code-upload.step2-title', 'Confirm')}
        nextLabel={t('common.finish', 'Finish')}
        backLabel={t('form.button.back', 'Back')}
        disableNext={!projectAttachment || isLoading}
      >
        <CodeConfirmationStep projectName={projectName} isLoading={isLoading} error={error} />
      </StepModal.Step>
    </StepModal>
  );
};
