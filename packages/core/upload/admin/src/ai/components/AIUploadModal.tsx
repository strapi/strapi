import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { Button, Flex, Modal } from '@strapi/design-system';
import { produce } from 'immer';
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
  const state = useAIUploadModalContext('ModalContent', (s) => s.state);
  const dispatch = useAIUploadModalContext('ModalContent', (s) => s.dispatch);
  const { upload, isLoading } = useUpload();

  const handleCaptionChange = (assetId: number, caption: string) => {
    dispatch({
      type: 'set_uploaded_assets',
      payload: state.uploadedAssets.map((asset) =>
        asset.id === assetId ? { ...asset, caption } : asset
      ),
    });
  };

  const handleAltTextChange = (assetId: number, altText: string) => {
    dispatch({
      type: 'set_uploaded_assets',
      payload: state.uploadedAssets.map((asset) =>
        asset.id === assetId ? { ...asset, alternativeText: altText } : asset
      ),
    });
  };

  const resetState = () => {
    dispatch({ type: 'set_uploaded_assets', payload: [] });
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
    dispatch({ type: 'set_assets_to_upload_length', payload: assets.length });

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
      dispatch({ type: 'set_uploaded_assets', payload: uploadedFiles });
    } catch (error) {
      // TODO: toast error
      console.error('Upload failed:', error);
    }
  };

  if (state.assetsToUploadLength === 0) {
    return (
      <Modal.Content>
        <AddAssetStep onClose={onClose} onAddAsset={handleUpload} />
      </Modal.Content>
    );
  }

  if (isLoading || (state.assetsToUploadLength > 0 && state.uploadedAssets.length === 0)) {
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
          <AIAssetCardSkeletons count={state.assetsToUploadLength} />
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
            { count: state.uploadedAssets.length }
          )}
        </Modal.Title>
      </Modal.Header>

      <StyledModalBody>
        <Flex gap={6} direction="column" alignItems="stretch">
          {state.uploadedAssets.map((asset) => (
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

type State = {
  uploadedAssets: File[];
  assetsToUploadLength: number;
};

type Action =
  | {
      type: 'set_uploaded_assets';
      payload: File[];
    }
  | {
      type: 'set_assets_to_upload_length';
      payload: number;
    };

const [AIUploadModalContext, useAIUploadModalContext] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('AIUploadModalContext');

const reducer = (state: State, action: Action): State => {
  return produce(state, (draft: State) => {
    if (action.type === 'set_uploaded_assets') {
      draft.uploadedAssets = action.payload;
    }

    if (action.type === 'set_assets_to_upload_length') {
      draft.assetsToUploadLength = action.payload;
    }
  });
};

export const AIUploadModal = ({ open, onClose }: AIUploadModalProps) => {
  const [state, dispatch] = React.useReducer(reducer, {
    uploadedAssets: [],
    assetsToUploadLength: 0,
  });

  return (
    <AIUploadModalContext state={state} dispatch={dispatch}>
      <Modal.Root open={open} onOpenChange={onClose}>
        <ModalContent onClose={onClose} />
      </Modal.Root>
    </AIUploadModalContext>
  );
};

export { useAIUploadModalContext };
