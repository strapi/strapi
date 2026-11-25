import { useRef, useState, type DragEvent, type ReactNode } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAIMetadataEnabled } from '../../hooks/useAIMetadataEnabled';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useTracking } from '../../hooks/useTracking';
import { useUploadFilesMutation } from '../../services/api';
import { useGetUploadSettingsQuery } from '../../services/settings';
import { filterAllowedFiles, type AllowedMediaType } from '../../utils/allowedMediaTypes';
import { getTranslationKey } from '../../utils/translations';
import { typeFromMime } from '../../utils/typeFromMime';

import type { File } from '../../../../shared/contracts/files';

type DragState = 'idle' | 'accept' | 'reject';

const FRAME_COLORS = {
  accept: { border: 'primary600', background: 'primary100', text: 'primary600' },
  reject: { border: 'neutral300', background: 'neutral150', text: 'neutral600' },
} as const;

// Takes the place of the editor's content in its layout, so it fills the same
// space: the editor stacks its parts against the start, sized to their content.
const Root = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-height: 0;
`;

const Frame = styled.div<{ $dragState: Exclude<DragState, 'idle'> }>`
  position: absolute;
  inset: ${({ theme }) => theme.spaces[2]};
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme, $dragState }) => theme.colors[FRAME_COLORS[$dragState].border]};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme, $dragState }) => theme.colors[FRAME_COLORS[$dragState].background]};
  pointer-events: none;
`;

export interface EditorFileDropZoneProps {
  children: ReactNode;
  disabled?: boolean;
  allowedTypes?: AllowedMediaType[];
  /**
   * Called once per accepted drop, while the drop event is still current. It
   * returns what receives each of that drop's files once uploaded, including
   * files a Retry in the progress dialog uploads later.
   */
  onDropFiles: (event: DragEvent<HTMLElement>) => (file: File) => void;
}

const hasFiles = (event: DragEvent<HTMLElement>) => event.dataTransfer.types.includes('Files');

/**
 * Lets an editor take files dropped onto it: they upload to the root of the
 * Media Library, through the global upload progress dialog, and are handed
 * back to the editor one by one. Drags that carry no file, such as an editor
 * reordering its own blocks, pass through untouched.
 */
export const EditorFileDropZone = ({
  children,
  disabled = false,
  allowedTypes,
  onDropFiles,
}: EditorFileDropZoneProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();
  const [uploadFiles] = useUploadFilesMutation();
  const { canRead, canCreate, isLoading } = useMediaLibraryPermissions();
  const { data: settings } = useGetUploadSettingsQuery(undefined, { skip: !canRead });
  const isAiMetadataEnabled = useAIMetadataEnabled();
  const [dragState, setDragState] = useState<DragState>('idle');
  // Drag events fire on every descendant crossed, so count enter/leave pairs.
  const dragDepth = useRef(0);

  const canUpload = !disabled && !isLoading && canCreate;

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth.current += 1;
    setDragState(canUpload ? 'accept' : 'reject');
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) {
      return;
    }

    dragDepth.current -= 1;

    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragState('idle');
    }
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) {
      return;
    }

    // Without it the browser opens the file in the tab.
    event.preventDefault();
    // `none` shows the no-drop cursor, and the browser then fires no `drop`.
    event.dataTransfer.dropEffect = canUpload ? 'copy' : 'none';
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth.current = 0;
    setDragState('idle');

    if (!canUpload) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    const allowedFiles = filterAllowedFiles(allowedTypes, files);

    if (allowedFiles.length < files.length) {
      toggleNotification({
        type: 'danger',
        timeout: 4000,
        message: formatMessage(
          {
            id: getTranslationKey('input.notification.not-supported'),
            defaultMessage: `You can't upload this type of file, only the following types are accepted – {fileTypes}`,
          },
          { fileTypes: (allowedTypes ?? []).join(',') }
        ),
      });
    }

    if (allowedFiles.length === 0) {
      return;
    }

    const onFileUploaded = onDropFiles(event);

    const assetsCountByType = allowedFiles.reduce<Record<string, number>>((acc, file) => {
      const type = typeFromMime(file.type);
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});
    trackUsage('didSelectFile', { source: 'computer', location: 'content-manager' });
    trackUsage('willAddMediaLibraryAssets', { location: 'content-manager', ...assetsCountByType });

    const formData = new FormData();
    allowedFiles.forEach((file) => formData.append('files', file));
    formData.append(
      'fileInfo',
      JSON.stringify(
        allowedFiles.map((file) => ({
          name: file.name,
          caption: null,
          alternativeText: null,
          folder: null,
        }))
      )
    );

    try {
      await uploadFiles({
        formData,
        totalFiles: allowedFiles.length,
        concurrency: settings?.data?.concurrentUploadRequests ?? 1,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
        onFileUploaded,
      }).unwrap();
    } catch {
      // Errors reach the user through the progress dialog, which the mutation
      // populates itself.
    }
  };

  return (
    <Root
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragState !== 'idle' && (
        <Frame $dragState={dragState} data-testid="editor-file-drop-zone">
          <Typography fontWeight="semiBold" textColor={FRAME_COLORS[dragState].text}>
            {dragState === 'accept'
              ? formatMessage({
                  id: getTranslationKey('editor-drop-zone.accept'),
                  defaultMessage: 'Drop to upload and insert',
                })
              : formatMessage({
                  id: getTranslationKey('editor-drop-zone.reject'),
                  defaultMessage: "You don't have permission to upload files",
                })}
          </Typography>
        </Frame>
      )}
    </Root>
  );
};
