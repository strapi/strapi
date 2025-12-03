import * as React from 'react';

import { createContext, useNotification } from '@strapi/admin/strapi-admin';
import { Alert, Button, Flex, Modal } from '@strapi/design-system';
import { produce } from 'immer';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  AddAssetStep,
  FileWithRawFile,
} from '../../components/UploadAssetDialog/AddAssetStep/AddAssetStep';
import { useBulkEdit } from '../../hooks/useBulkEdit';
import { useTracking } from '../../hooks/useTracking';
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
  const { toggleNotification } = useNotification();
  const state = useAIUploadModalContext('ModalContent', (s) => s.state);
  const dispatch = useAIUploadModalContext('ModalContent', (s) => s.dispatch);
  const folderId = useAIUploadModalContext('ModalContent', (s) => s.folderId);
  const { upload } = useUpload();
  const { edit, isLoading: isSaving } = useBulkEdit();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<Error | null>(null);
  const { trackUsage } = useTracking();

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

  const handleFinish = async () => {
    if (state.hasUnsavedChanges) {
      const assetsToUpdate = state.uploadedAssets.filter(
        (asset) => (asset.wasCaptionChanged || asset.wasAltTextChanged) && asset.file.id
      );

      if (assetsToUpdate.length > 0) {
        if (assetsToUpdate.some((asset) => asset.wasCaptionChanged)) {
          trackUsage('didEditAICaption');
        }

        if (assetsToUpdate.some((asset) => asset.wasAltTextChanged)) {
          trackUsage('didEditAIAlternativeText');
        }

        // Update assets
        const updates = assetsToUpdate.map((asset) => ({
          id: asset.file.id!,
          fileInfo: {
            name: asset.file.name,
            alternativeText: asset.file.alternativeText ?? null,
            caption: asset.file.caption ?? null,
            folder:
              typeof asset.file.folder === 'object' && asset.file.folder !== null
                ? // @ts-expect-error types are wrong
                  asset.file.folder.id
                : asset.file.folder,
          },
        }));

        try {
          await edit(updates);
          dispatch({ type: 'clear_unsaved_changes' });
        } catch (err) {
          toggleNotification({
            type: 'danger',
            message:
              (err instanceof Error ? err.message : null) ||
              formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
          });
          return; // Don't close modal on error
        }
      }
    }

    resetState();
    onClose();
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const handleUpload = async (assets: FileWithRawFile[]) => {
    dispatch({ type: 'set_assets_to_upload_length', payload: assets.length });
    setUploadError(null);
    setIsUploading(true);

    try {
      const assetsForUpload = assets.map((asset) => ({
        ...asset,
        id: asset.id ? Number(asset.id) : undefined,
      }));

      const uploadedFiles = await upload(assetsForUpload, folderId);
      const filesWithFolder = uploadedFiles.map((file: File) => ({
        ...file,
        // The upload API doesn't populate the folder relation, so we add it manually
        folder: folderId || file.folder,
      }));
      dispatch({ type: 'set_uploaded_assets', payload: filesWithFolder });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  if (state.assetsToUploadLength === 0) {
    return (
      <Modal.Content>
        <AddAssetStep onClose={onClose} onAddAsset={handleUpload} />
      </Modal.Content>
    );
  }

  if (
    isUploading ||
    (state.assetsToUploadLength > 0 && state.uploadedAssets.length === 0 && !uploadError)
  ) {
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
        '{count, plural, one {# asset uploaded} other {# assets uploaded}}, review AI generated metadata',
    },
    { count: state.uploadedAssets.length }
  );

  if (uploadError) {
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
          <Button onClick={handleFinish} loading={isSaving}>
            {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
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
        <Button onClick={handleFinish} loading={isSaving}>
          {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
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
  folderId?: number | null;
}

type State = {
  uploadedAssets: Array<{ file: File; wasCaptionChanged: boolean; wasAltTextChanged: boolean }>;
  assetsToUploadLength: number;
  hasUnsavedChanges: boolean;
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
    }
  | {
      type: 'clear_unsaved_changes';
    };

const [AIUploadModalContext, useAIUploadModalContext] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  folderId: number | null;
  onClose: () => void;
}>('AIUploadModalContext');

const reducer = (state: State, action: Action): State => {
  return produce(state, (draft: State) => {
    if (action.type === 'set_uploaded_assets') {
      draft.uploadedAssets = action.payload.map((file) => ({
        file,
        wasCaptionChanged: false,
        wasAltTextChanged: false,
      }));
      draft.hasUnsavedChanges = false;
    }

    if (action.type === 'set_assets_to_upload_length') {
      draft.assetsToUploadLength = action.payload;
    }

    if (action.type === 'set_uploaded_asset_caption') {
      const asset = draft.uploadedAssets.find((a) => a.file.id === action.payload.id);
      if (asset && asset.file.caption !== action.payload.caption) {
        asset.file.caption = action.payload.caption;
        asset.wasCaptionChanged = true;
        draft.hasUnsavedChanges = true;
      }
    }

    if (action.type === 'set_uploaded_asset_alt_text') {
      const asset = draft.uploadedAssets.find((a) => a.file.id === action.payload.id);
      if (asset && asset.file.alternativeText !== action.payload.altText) {
        asset.file.alternativeText = action.payload.altText;
        asset.wasAltTextChanged = true;
        draft.hasUnsavedChanges = true;
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

    if (action.type === 'clear_unsaved_changes') {
      draft.hasUnsavedChanges = false;
      draft.uploadedAssets.forEach((asset) => {
        asset.wasCaptionChanged = false;
        asset.wasAltTextChanged = false;
      });
    }
  });
};

export const AIUploadModal = ({ open, onClose, folderId = null }: AIUploadModalProps) => {
  const [state, dispatch] = React.useReducer(reducer, {
    uploadedAssets: [],
    assetsToUploadLength: 0,
    hasUnsavedChanges: false,
  });

  const handleClose = React.useCallback(() => {
    // Reset state when modal closes
    dispatch({ type: 'set_uploaded_assets', payload: [] });
    onClose();
  }, [onClose]);

  return (
    <AIUploadModalContext
      state={state}
      dispatch={dispatch}
      folderId={folderId}
      onClose={handleClose}
    >
      <Modal.Root open={open} onOpenChange={handleClose}>
        <ModalContent onClose={handleClose} />
      </Modal.Root>
    </AIUploadModalContext>
  );
};

export { useAIUploadModalContext };
