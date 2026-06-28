import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { produce } from 'immer';

import type { File } from '../../../../shared/contracts/files';

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

const initialState: State = {
  uploadedAssets: [],
  assetsToUploadLength: 0,
  hasUnsavedChanges: false,
};

const [AIUploadModalContext, useAIUploadModalContext] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  folderId: number | null;
  onClose: () => void;
}>('AIUploadModalContext');

const aiUploadModalReducer = (state: State, action: Action): State => {
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

export {
  AIUploadModalContext,
  useAIUploadModalContext,
  aiUploadModalReducer,
  initialState as aiUploadModalInitialState,
};

export type { State as AIUploadModalState, Action as AIUploadModalAction };
