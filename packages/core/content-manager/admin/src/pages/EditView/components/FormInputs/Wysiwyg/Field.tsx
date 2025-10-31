import * as React from 'react';

import {
  useField,
  useStrapiApp,
  useFetchClient,
  useNotification,
  type InputProps,
} from '@strapi/admin/strapi-admin';
import { Field, Flex } from '@strapi/design-system';
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
    const [isUploading, setIsUploading] = React.useState(false);
    const components = useStrapiApp('ImageDialog', (state) => state.components);
    const { post } = useFetchClient();
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

      setIsUploading(true);

      try {
        // Create FormData for the upload
        const formData = new FormData();

        // Add all files
        files.forEach((file) => {
          formData.append('files', file);
        });

        // Add fileInfo for each file
        files.forEach((file) => {
          formData.append(
            'fileInfo',
            JSON.stringify({
              name: file.name,
              alternativeText: file.name.split('.')[0],
            })
          );
        });

        // Upload the files
        const message = formatMessage(
          {
            id: 'content-manager.components.Wysiwyg.uploading',
            defaultMessage: 'Uploading {count, plural, one {# image} other {# images}}...',
          },
          { count: files.length }
        );

        toggleNotification({
          type: 'info',
          message,
        });

        const response = await post<Array<Record<string, string>>>('/upload', formData);

        if (response.data && response.data.length > 0) {
          // Format all uploaded files for insertion
          const formattedFiles = response.data.map((uploadedFile) => ({
            alt: uploadedFile.alternativeText || uploadedFile.name,
            url: prefixFileUrlWithBackendUrl(uploadedFile.url),
            mime: uploadedFile.mime,
          }));

          // Insert all images into the editor
          insertFile(editorRef, formattedFiles);

          const successMessage = formatMessage(
            {
              id: 'content-manager.components.Wysiwyg.upload-success',
              defaultMessage:
                '{count, plural, one {Image uploaded and inserted successfully} other {# images uploaded and inserted successfully}}',
            },
            { count: files.length }
          );

          toggleNotification({
            type: 'success',
            message: successMessage,
          });
        }
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
      } finally {
        setIsUploading(false);
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
