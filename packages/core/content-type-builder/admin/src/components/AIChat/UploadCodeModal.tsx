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

  const { openChat } = useStrapiChat();

  const openCodeUpload = (submitOnFinish?: boolean) => {
    openChat();
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e?.dataTransfer?.files) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
    setDragOver(false);
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
        <Typography variant="beta">
          {t('chat.code-upload.title', 'Import a Next.js app')}
        </Typography>
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
            name: projectName || '',
            url: '',
            contentType: STRAPI_CODE_MIME_TYPE,
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
  const { setMessages, reload } = useStrapiChat();

  const handleCancel = () => {
    setProjectName(null);
    setProjectAttachment(null);
    closeCodeUpload();
  };

  const handleComplete = async () => {
    if (projectAttachment && submitOnFinish) {
      setMessages(() => [
        {
          role: 'user',
          content: 'Create schemas from my uploaded project',
          id: 'first-message',
          experimental_attachments: [projectAttachment],
          parts: [
            {
              type: 'text',
              text: 'Create schemas from my uploaded project',
            },
          ],
        },
      ]);

      reload();
    } else if (projectAttachment) {
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
      title={t('chat.code-upload.header', 'Import a Next.js app')}
      onCancel={handleCancel}
      onComplete={handleComplete}
    >
      <StepModal.Step
        title={t('chat.code-upload.step1-title', 'Upload Project')}
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
