import * as React from 'react';

import {
  useField,
  useStrapiApp,
  useNotification,
  type InputProps,
} from '@strapi/admin/strapi-admin';
import { Field, Flex } from '@strapi/design-system';
import { useUpload, type Asset } from '@strapi/upload/strapi-admin';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';

import { prefixFileUrlWithBackendUrl } from '../../../../../utils/urls';

import { Editor, EditorApi } from './Editor';
import { EditorLayout } from './EditorLayout';
import { insertFile } from './utils/utils';
import { WysiwygFooter } from './WysiwygFooter';
import { WysiwygNav } from './WysiwygNav';

import type { Schema } from '@strapi/types';

interface WysiwygProps extends Omit<InputProps, 'type'> {
  labelAction?: React.ReactNode;
  type: Schema.Attribute.RichText['type'];
}

const Wysiwyg = React.forwardRef<EditorApi, WysiwygProps>(
  ({ hint, disabled, label, name, placeholder, required, labelAction }, forwardedRef) => {
    const field = useField(name);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const editorRef = React.useRef<EditorFromTextArea>(
      null
    ) as React.MutableRefObject<EditorFromTextArea>;
    const [isPreviewMode, setIsPreviewMode] = React.useState(false);
    const [mediaLibVisible, setMediaLibVisible] = React.useState(false);
    const [isExpandMode, setIsExpandMode] = React.useState(false);
    const components = useStrapiApp('ImageDialog', (state) => state.components);
    const { upload, isLoading: isUploading } = useUpload();
    const { toggleNotification } = useNotification();
    const { formatMessage } = useIntl();

    const MediaLibraryDialog = components['media-library'];

    const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);
    const handleTogglePreviewMode = () => setIsPreviewMode((prev) => !prev);
    const handleToggleExpand = () => {
      setIsPreviewMode(false);
      setIsExpandMode((prev) => !prev);
    };

    const handleSelectAssets = (files: Array<Record<string, string>>) => {
      const formattedFiles = files.map((f) => ({
        alt: f.alternativeText || f.name,
        url: prefixFileUrlWithBackendUrl(f.url),
        mime: f.mime,
      }));

      insertFile(editorRef, formattedFiles);
      setMediaLibVisible(false);
    };

    const handlePasteImage = async (files: File[]) => {
      if (isUploading || files.length === 0) return;

      try {
        toggleNotification({
          type: 'info',
          message: formatMessage(
            {
              id: 'content-manager.components.Wysiwyg.uploading',
              defaultMessage: 'Uploading {count, plural, one {# image} other {# images}}...',
            },
            { count: files.length }
          ),
        });

        // Prepare assets for upload using the upload plugin's expected format
        const assets: Asset[] = files.map((file) => ({
          name: file.name,
          alternativeText: file.name.split('.')[0],
          rawFile: file,
        }));

        // Use the upload hook to handle the upload
        const uploadedFiles = await upload(assets, null);

        // Format uploaded files for insertion into the editor
        const formattedFiles = uploadedFiles.map((uploadedFile: Asset) => ({
          alt: uploadedFile.alternativeText || uploadedFile.name,
          url: prefixFileUrlWithBackendUrl(uploadedFile.url!),
          mime: uploadedFile.mime,
        }));

        // Insert all images into the editor
        insertFile(editorRef, formattedFiles);

        // Show success notification
        toggleNotification({
          type: 'success',
          message: formatMessage(
            {
              id: 'content-manager.components.Wysiwyg.upload-success',
              defaultMessage:
                '{count, plural, one {Image uploaded and inserted successfully} other {# images uploaded and inserted successfully}}',
            },
            { count: files.length }
          ),
        });
      } catch (error) {
        console.error('Error uploading pasted image:', error);
        toggleNotification({
          type: 'danger',
          message: formatMessage(
            {
              id: 'content-manager.components.Wysiwyg.upload-error',
              defaultMessage: 'Error uploading {count, plural, one {image} other {images}}',
            },
            { count: files.length }
          ),
        });
      }
    };

    return (
      <Field.Root name={name} hint={hint} error={field.error} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label action={labelAction}>{label}</Field.Label>
          <EditorLayout
            isExpandMode={isExpandMode}
            error={field.error}
            previewContent={field.value}
            onCollapse={handleToggleExpand}
          >
            <WysiwygNav
              isExpandMode={isExpandMode}
              editorRef={editorRef}
              isPreviewMode={isPreviewMode}
              onToggleMediaLib={handleToggleMediaLib}
              onTogglePreviewMode={isExpandMode ? undefined : handleTogglePreviewMode}
              disabled={disabled}
            />

            <Editor
              disabled={disabled}
              isExpandMode={isExpandMode}
              editorRef={editorRef}
              error={field.error}
              isPreviewMode={isPreviewMode}
              name={name}
              onChange={field.onChange}
              placeholder={placeholder}
              textareaRef={textareaRef}
              value={field.value}
              onPasteImage={handlePasteImage}
              ref={forwardedRef}
            />

            {!isExpandMode && <WysiwygFooter onToggleExpand={handleToggleExpand} />}
          </EditorLayout>
          <Field.Hint />
          <Field.Error />
        </Flex>
        {mediaLibVisible && (
          // @ts-expect-error – TODO: fix this way of injecting because it's not really typeable without a registry.
          <MediaLibraryDialog onClose={handleToggleMediaLib} onSelectAssets={handleSelectAssets} />
        )}
      </Field.Root>
    );
  }
);

const MemoizedWysiwyg = React.memo(Wysiwyg);

export { MemoizedWysiwyg as Wysiwyg };
export type { WysiwygProps };
