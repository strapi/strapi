import { createContext, useContext, useState } from 'react';

import { Flex, Typography, Box, TextInput, Grid, Button, Link } from '@strapi/design-system'; // Added Link

import { ImagePreview } from './components/ImagePreview';
import { StepModal, useStepModal } from './components/StepModal';
import { useAttachments } from './hooks/useAttachments';
import {
  FigmaImage,
  useFigmaUpload,
  getFigmaToken,
  saveFigmaToken,
  hasFigmaToken,
} from './hooks/useFigmaUpload';
import { useTranslations } from './hooks/useTranslations';
import { useStrapiChat } from './providers/ChatProvider';

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/
interface UploadFigmaContextType {
  isFigmaUploadOpen: boolean;
  submitOnFinish: boolean;
  openFigmaUpload: (submitOnFinish?: boolean) => void;
  closeFigmaUpload: () => void;
}

const UploadFigmaContext = createContext<UploadFigmaContextType>({
  isFigmaUploadOpen: false,
  submitOnFinish: false,
  openFigmaUpload: () => {},
  closeFigmaUpload: () => {},
});

export const useUploadFigmaToChat = () => {
  const context = useContext(UploadFigmaContext);
  if (!context) {
    throw new Error('useUploadFigmaToChat must be used within an UploadFigmaToChatProvider');
  }
  return context;
};

export const UploadFigmaToChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isFigmaUploadOpen, setIsFigmaUploadOpen] = useState(false); // Default to false
  const [submitOnFinish, setSubmitOnFinish] = useState(false);

  const openFigmaUpload = (submitOnFinishParam?: boolean) => {
    setIsFigmaUploadOpen(true);
    setSubmitOnFinish(submitOnFinishParam ?? false);
  };

  const closeFigmaUpload = () => setIsFigmaUploadOpen(false);

  return (
    <UploadFigmaContext.Provider
      value={{ isFigmaUploadOpen, submitOnFinish, openFigmaUpload, closeFigmaUpload }}
    >
      {isFigmaUploadOpen && <UploadFigmaModal />}
      {children}
    </UploadFigmaContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step 1 - Input Figma URL
 * -----------------------------------------------------------------------------------------------*/

interface FigmaUrlInputStepProps {
  figmaUrl: string;
  setFigmaUrl: (url: string) => void;
  error: string | null; // Error state from useFigmaUpload
}

const FigmaUrlInputStep = ({ figmaUrl, setFigmaUrl }: FigmaUrlInputStepProps) => {
  const { t } = useTranslations();
  const { isLoading } = useStepModal();
  const [showingTokenInput, setShowingTokenInput] = useState(!hasFigmaToken());
  const [figmaToken, setFigmaToken] = useState<string>(getFigmaToken);

  // Handle saving token and returning to URL input
  const handleSaveToken = () => {
    if (figmaToken.trim()) {
      saveFigmaToken(figmaToken);
      setShowingTokenInput(false);
    }
  };

  // If we need to show token step, render the token input
  if (showingTokenInput) {
    return (
      <Flex direction="column" gap={6} alignItems="start">
        <Flex direction="column" gap={2} alignItems="start">
          <Typography variant="beta">
            {t('chat.figma-upload.token-title', 'Enter Figma API Token')}
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            {t(
              'chat.figma-upload.token-description',
              'To access your Figma designs, you need to provide a personal access token. This will be stored securely in your browser.'
            )}
          </Typography>
          <Link
            href="https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
            isExternal
          >
            {t('chat.figma-upload.token-help', 'How to get a Figma API token')}
          </Link>
        </Flex>

        <Box width="100%">
          <TextInput
            name="figma-token"
            placeholder={t('chat.figma-upload.token-placeholder', 'Enter Figma API token')}
            aria-label={t('chat.figma-upload.token-placeholder', 'Enter Figma API token')}
            value={figmaToken}
            onChange={(e) => setFigmaToken(e.target.value)}
            width="100%"
            disabled={isLoading}
            type="password"
          />
        </Box>

        <Flex gap={2}>
          <Button onClick={handleSaveToken} disabled={!figmaToken.trim()} variant="secondary">
            {t('chat.figma-upload.save-token', 'Save token')}
          </Button>
          <Button
            onClick={() => setShowingTokenInput(false)}
            variant="tertiary"
            disabled={!hasFigmaToken()}
          >
            {t('chat.figma-upload.cancel', 'Cancel')}
          </Button>
        </Flex>
      </Flex>
    );
  }

  // Otherwise render the URL input
  return (
    <Flex direction="column" gap={6} alignItems="start">
      <Flex direction="column" gap={2} alignItems="start" width="100%">
        <Flex justifyContent="space-between" alignItems="center" width="100%">
          <Typography variant="beta">
            {t('chat.figma-upload.title', 'Import Figma Design')}
          </Typography>
          <Button onClick={() => setShowingTokenInput(true)} variant="tertiary" size="S">
            {t('chat.figma-upload.edit-token', 'Edit API token')}
          </Button>
        </Flex>
        <Typography variant="omega" textColor="neutral600">
          {t(
            'chat.figma-upload.description',
            'Ask to turn your designs into schemas by attaching a link to one or multiple frames in your Figma files. (Max 15 frames)'
          )}
        </Typography>
      </Flex>

      <Box width="100%">
        <TextInput
          name="figma-url"
          placeholder={t('chat.figma-upload.url-placeholder', 'Enter Figma URL')}
          aria-label={t('chat.figma-upload.url-placeholder', 'Enter Figma URL')}
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          width="100%"
          disabled={isLoading}
          type="url"
        />
      </Box>

      {/* {error && (
        <Box padding={3} background="danger100" color="danger600" borderRadius="4px" width="100%">
          <Typography variant="pi">{error}</Typography>
        </Box>
      )} */}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step 2 - Display Figma Images
 * -----------------------------------------------------------------------------------------------*/

interface FigmaImageDisplayStepProps {
  images: FigmaImage[];
  selectedImages: string[];
  setSelectedImages: (images: string[]) => void;
}

const FigmaImageDisplayStep = ({
  images,
  selectedImages,
  setSelectedImages,
}: FigmaImageDisplayStepProps) => {
  const { t } = useTranslations();

  // Handle select/deselect all
  const toggleSelectAll = () => {
    if (selectedImages.length === images.length) {
      // Deselect all if all or max allowed are selected
      setSelectedImages([]);
    } else {
      // Select all images up to the max limit
      const allImageIds = images.map((img) => img.id);
      setSelectedImages(allImageIds);
    }
  };

  if (images.length === 0) {
    return (
      <Flex direction="column" gap={4} alignItems="center" padding={4}>
        <Typography variant="omega">
          {t('chat.figma-upload.no-images', 'No frames found in the Figma file.')}
        </Typography>
      </Flex>
    );
  }

  // Handle individual frame selection
  const handleFrameSelection = (frameId: string) => {
    const newSelection = selectedImages.includes(frameId)
      ? selectedImages.filter((id) => id !== frameId)
      : [...selectedImages, frameId];

    setSelectedImages(newSelection);
  };

  return (
    <Flex direction="column" gap={4} alignItems="start" width="100%" height="min(45vh, 400px)">
      <Flex justifyContent="space-between" width="100%" alignItems="center">
        <Typography variant="beta">
          {t('chat.figma-upload.select-images', 'Select Frames to Import')}
        </Typography>
        <Flex gap={3} alignItems="center">
          <Typography>
            {selectedImages.length} of {images.length} selected
          </Typography>
          <Button onClick={toggleSelectAll} type="button" variant="secondary">
            {/* Determine if select all button should show "Select All" or "Deselect All" */}
            {selectedImages.length === images.length
              ? t('chat.figma-upload.deselect-all', 'Deselect All')
              : t('chat.figma-upload.select-all', 'Select All')}
          </Button>
        </Flex>
      </Flex>

      <Box paddingRight={4} width="100%" style={{ overflowY: 'auto' }}>
        <Grid.Root gap={4}>
          {images.map((frame, index) => {
            const isSelected = selectedImages.includes(frame.id);
            return (
              <Grid.Item key={frame.id} col={6} xs={12} padding={'1px'}>
                <ImagePreview
                  imageUrl={frame.url}
                  imageName={frame.filename || `Frame ${index + 1}`}
                  selected={isSelected}
                  onSelect={() => handleFrameSelection(frame.id)}
                />
              </Grid.Item>
            );
          })}
        </Grid.Root>
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Modal
 * -----------------------------------------------------------------------------------------------*/
export const UploadFigmaModal = () => {
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [figmaImages, setFigmaImages] = useState<FigmaImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const { t } = useTranslations();

  const { addAttachments } = useAttachments();
  const { isFigmaUploadOpen, closeFigmaUpload, submitOnFinish } = useUploadFigmaToChat();
  const { input, setInput, setMessages, sendMessage, openChat } = useStrapiChat();
  const { processFigmaUrl, isLoading, error } = useFigmaUpload({
    onSuccess: (images) => {
      setFigmaImages(images);
      // Initialize with first 15 images selected
      const initialSelection = images.slice(0, 15).map((img) => img.id);
      setSelectedImages(initialSelection);
    },
  });

  const handleImportStep = async () => {
    await processFigmaUrl(figmaUrl);
    return true;
  };

  // Validate if the URL is a valid Figma URL
  const isValidFigmaUrl = (url: string) => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.figma.com' || urlObj.hostname === 'figma.com';
    } catch (e) {
      return false;
    }
  };

  const handleCancel = () => {
    // Reset all state on cancel
    setFigmaUrl('');
    setFigmaImages([]);
    setSelectedImages([]);
    closeFigmaUpload();
  };

  const handleComplete = () => {
    // Only attach the selected images
    const selectedFigmaImages = figmaImages.filter((img) => selectedImages.includes(img.id));
    if (selectedFigmaImages.length === 0) {
      closeFigmaUpload();
      return;
    }

    // Ensure chat is opened
    openChat();

    if (submitOnFinish) {
      // Auto-submit a message to chat with attachments
      sendMessage({
        role: 'user',
        parts: [
          { type: 'text', text: 'Create schemas from the attached images' },
          ...selectedFigmaImages,
        ],
      });

      closeFigmaUpload();
    } else {
      // If input is empty, set a predefined message
      if (!input) {
        setInput('Create schemas from the attached images');
      }
      addAttachments(selectedFigmaImages);
      closeFigmaUpload();
    }
  };

  return (
    <StepModal
      open={isFigmaUploadOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}
      title={t('chat.figma-upload.header', 'Import from Figma')}
      onCancel={handleCancel}
      onComplete={handleComplete}
    >
      <StepModal.Step
        title={t('chat.figma-upload.step1-title', 'Enter Figma URL')}
        nextLabel={t('chat.figma-upload.import-button', 'Import')}
        cancelLabel={t('form.button.cancel', 'Cancel')}
        disableNext={!figmaUrl || isLoading || !isValidFigmaUrl(figmaUrl)}
        onNext={handleImportStep}
      >
        <FigmaUrlInputStep figmaUrl={figmaUrl} setFigmaUrl={setFigmaUrl} error={error} />
      </StepModal.Step>

      <StepModal.Step
        title={t('chat.figma-upload.step2-title', 'Preview Images')}
        nextLabel={t('form.button.finish', 'Finish')}
        backLabel={t('form.button.back', 'Back')}
        disableNext={selectedImages.length === 0}
      >
        <FigmaImageDisplayStep
          images={figmaImages}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
        />
      </StepModal.Step>
    </StepModal>
  );
};
