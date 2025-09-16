import * as React from 'react';

import { Button, Flex, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  AddAssetStep,
  FileWithRawFile,
} from '../../components/UploadAssetDialog/AddAssetStep/AddAssetStep';
import { useUpload } from '../../hooks/useUpload';
import { getTrad } from '../../utils';

import { AIAssetCard, AIAssetCardSkeletons } from './AIAssetCard';

import type { File } from '../../../../shared/contracts/files';

/* -------------------------------------------------------------------------------------------------
 * ModalBody
 * -----------------------------------------------------------------------------------------------*/

const StyledModalBody = styled(Modal.Body)`
  padding: 0;
  display: flex;
  justify-content: center;

  [data-radix-scroll-area-viewport] {
    padding-top: ${({ theme }) => theme.spaces[6]};
    padding-bottom: ${({ theme }) => theme.spaces[6]};
    padding-left: ${({ theme }) => theme.spaces[7]};
    padding-right: ${({ theme }) => theme.spaces[7]};
  }
`;

const ModalContent = ({ onClose }: Pick<AIUploadModalProps, 'onClose'>) => {
  const { formatMessage } = useIntl();
  const [uploadedAssets, setUploadedAssets] = React.useState<File[]>([]);
  const [assetsToUploadLength, setAssetsToUploadLength] = React.useState(0);
  const { upload, isLoading } = useUpload();

  const handleCaptionChange = (assetId: number, caption: string) => {
    setUploadedAssets((prev) =>
      prev.map((asset) => (asset.id === assetId ? { ...asset, caption } : asset))
    );
  };

  const handleAltTextChange = (assetId: number, altText: string) => {
    setUploadedAssets((prev) =>
      prev.map((asset) => (asset.id === assetId ? { ...asset, alternativeText: altText } : asset))
    );
  };

  const resetState = () => {
    setUploadedAssets([]);
  };

  const handleDone = () => {
    resetState();
    // TODO: Bulk update assets after upload if the user manually updates the caption or alt text
    onClose();
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const handleUpload = async (assets: FileWithRawFile[]) => {
    setAssetsToUploadLength(assets.length);

    try {
      const uploadPromises = assets.map(async (asset) => {
        const assetForUpload = {
          ...asset,
          id: asset.id ? Number(asset.id) : undefined,
        };
        return upload(assetForUpload, null);
      });

      const results = await Promise.all(uploadPromises);
      const uploadedFiles = results.flat().filter(Boolean);
      setUploadedAssets(uploadedFiles);
    } catch (error) {
      // TODO: toast error
      console.error('Upload failed:', error);
    }
  };

  if (assetsToUploadLength === 0) {
    return (
      <Modal.Content>
        <AddAssetStep onClose={onClose} onAddAsset={handleUpload} />
      </Modal.Content>
    );
  }

  if (isLoading || (assetsToUploadLength > 0 && uploadedAssets.length === 0)) {
    return (
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('ai.modal.uploading.title'),
              defaultMessage: 'Uploading and processing with AI...',
            })}
          </Modal.Title>
        </Modal.Header>
        <StyledModalBody>
          <AIAssetCardSkeletons count={assetsToUploadLength} />
        </StyledModalBody>
      </Modal.Content>
    );
  }

  return (
    <Modal.Content>
      <Modal.Header>
        <Modal.Title>
          {formatMessage(
            {
              id: getTrad('ai.modal.title'),
              defaultMessage:
                '{count, plural, one {# Asset uploaded} other {# Assets uploaded}} time to review AI generated content',
            },
            { count: uploadedAssets.length }
          )}
        </Modal.Title>
      </Modal.Header>

      <StyledModalBody>
        <Flex gap={6} direction="column" alignItems="stretch">
          {uploadedAssets.map((asset) => (
            <AIAssetCard
              key={asset.id}
              asset={asset}
              onCaptionChange={(caption: string) =>
                asset.id && handleCaptionChange(asset.id, caption)
              }
              onAltTextChange={(altText: string) =>
                asset.id && handleAltTextChange(asset.id, altText)
              }
            />
          ))}
        </Flex>
      </StyledModalBody>

      <Modal.Footer>
        <Button onClick={handleCancel} variant="tertiary">
          {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button onClick={handleDone}>
          {formatMessage({ id: 'global.done', defaultMessage: 'Done' })}
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UploadModal
 * -----------------------------------------------------------------------------------------------*/

interface AIUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export const AIUploadModal = ({ open, onClose }: AIUploadModalProps) => {
  return (
    <Modal.Root open={open} onOpenChange={onClose}>
      <ModalContent onClose={onClose} />
    </Modal.Root>
  );
};
