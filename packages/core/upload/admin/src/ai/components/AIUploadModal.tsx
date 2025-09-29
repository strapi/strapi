import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { Alert, Button, Flex, Modal } from '@strapi/design-system';
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

const StyledAlert = styled(Alert)`
  & > button {
    display: none;
  }
`;

const ModalContent = ({ onClose }: Pick<AIUploadModalProps, 'onClose'>) => {
  const { formatMessage } = useIntl();
  const state = useAIUploadModalContext('ModalContent', (s) => s.state);
  const dispatch = useAIUploadModalContext('ModalContent', (s) => s.dispatch);
  const { upload, isLoading, error } = useUpload();

  const handleCaptionChange = (assetId: number, caption: string) => {
    dispatch({
      type: 'set_uploaded_asset_caption',
      payload: { id: assetId, caption },
    });
  };

  const handleAltTextChange = (assetId: number, altText: string) => {
    dispatch({
      type: 'set_uploaded_asset_alt_text',
      payload: { id: assetId, altText },
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

  const title = formatMessage(
    {
      id: getTrad('ai.modal.title'),
      defaultMessage:
        '{count, plural, one {# Asset uploaded} other {# Assets uploaded}} time to review AI generated content',
    },
    { count: state.uploadedAssets.length }
  );

  if (error) {
    return (
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <StyledAlert closeLabel="" variant="danger">
            {formatMessage({
              id: getTrad('ai.modal.error'),
              defaultMessage: 'Could not generate AI metadata for the uploaded files.',
            })}
          </StyledAlert>
        </Modal.Body>
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
  }

  return (
    <Modal.Content>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <StyledModalBody>
        <Flex gap={6} direction="column" alignItems="stretch">
          {state.uploadedAssets.map(({ file: asset, wasCaptionChanged, wasAltTextChanged }) => (
            <AIAssetCard
              key={asset.id}
              asset={asset}
              onCaptionChange={(caption: string) =>
                asset.id && handleCaptionChange(asset.id, caption)
              }
              onAltTextChange={(altText: string) =>
                asset.id && handleAltTextChange(asset.id, altText)
              }
              wasCaptionChanged={wasCaptionChanged}
              wasAltTextChanged={wasAltTextChanged}
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
  uploadedAssets: Array<{ file: File; wasCaptionChanged: boolean; wasAltTextChanged: boolean }>;
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
    }
  | {
      type: 'set_uploaded_asset_caption';
      payload: { id: number; caption: string };
    }
  | {
      type: 'set_uploaded_asset_alt_text';
      payload: { id: number; altText: string };
    }
  | {
      type: 'remove_uploaded_asset';
      payload: { id: number };
    }
  | {
      type: 'edit_uploaded_asset';
      payload: { editedAsset: File };
    };

const [AIUploadModalContext, useAIUploadModalContext] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('AIUploadModalContext');

const reducer = (state: State, action: Action): State => {
  return produce(state, (draft: State) => {
    if (action.type === 'set_uploaded_assets') {
      draft.uploadedAssets = action.payload.map((file) => ({
        file,
        wasCaptionChanged: false,
        wasAltTextChanged: false,
      }));
    }

    if (action.type === 'set_assets_to_upload_length') {
      draft.assetsToUploadLength = action.payload;
    }

    if (action.type === 'set_uploaded_asset_caption') {
      const asset = draft.uploadedAssets.find((a) => a.file.id === action.payload.id);
      if (asset) {
        asset.file.caption = action.payload.caption;
        asset.wasCaptionChanged = true;
      }
    }

    if (action.type === 'set_uploaded_asset_alt_text') {
      const asset = draft.uploadedAssets.find((a) => a.file.id === action.payload.id);
      if (asset) {
        asset.file.alternativeText = action.payload.altText;
        asset.wasAltTextChanged = true;
      }
    }

    if (action.type === 'remove_uploaded_asset') {
      draft.uploadedAssets = draft.uploadedAssets.filter((a) => a.file.id !== action.payload.id);
    }

    if (action.type === 'edit_uploaded_asset') {
      const assetIndex = draft.uploadedAssets.findIndex(
        (a) => a.file.id === action.payload.editedAsset.id
      );
      if (assetIndex !== -1) {
        draft.uploadedAssets[assetIndex] = {
          file: action.payload.editedAsset,
          wasCaptionChanged: draft.uploadedAssets[assetIndex].wasCaptionChanged,
          wasAltTextChanged: draft.uploadedAssets[assetIndex].wasAltTextChanged,
        };
      }
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
