import * as React from 'react';

import { Layouts, useNotification, useAPIErrorHandler } from '@strapi/admin/strapi-admin';
import { MenuItem, SimpleMenu, VisuallyHidden } from '@strapi/design-system';
import { ChevronDown, Files } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useUploadFilesMutation } from '../services/api';
import { getTranslationKey } from '../utils/translations';

export const MediaLibraryPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError } = useAPIErrorHandler();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadFiles] = useUploadFilesMutation();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      const filesArray = Array.from(files);

      // Add files and fileInfo to the form data
      filesArray.forEach((file) => {
        formData.append('files', file);
        formData.append(
          'fileInfo',
          JSON.stringify({
            name: file.name,
            caption: null,
            alternativeText: null,
            folder: null,
          })
        );
      });

      try {
        // unwrap() is needed to throw errors and trigger the catch block
        // Without it, RTK Query never rejects and catch would never execute
        await uploadFiles(formData).unwrap();
        toggleNotification({
          type: 'success',
          message: formatMessage(
            {
              id: getTranslationKey('assets.uploaded'),
              defaultMessage:
                '{number, plural, one {# asset} other {# assets}} uploaded successfully',
            },
            { number: filesArray.length }
          ),
        });
      } catch (error) {
        // Format the error message using the API error handler to provide
        // context-specific feedback (e.g., file size limits, format restrictions, network errors)
        const errorMessage = _unstableFormatAPIError(error as Error);
        toggleNotification({
          type: 'danger',
          message: errorMessage,
        });
      }
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <Layouts.Root>
      <VisuallyHidden>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
      </VisuallyHidden>
      <Layouts.Header
        title="TODO: Folder location"
        primaryAction={
          <SimpleMenu
            popoverPlacement="bottom-end"
            variant="default"
            endIcon={<ChevronDown />}
            label={formatMessage({ id: getTranslationKey('new'), defaultMessage: 'New' })}
          >
            <MenuItem onSelect={handleFileSelect} startIcon={<Files />}>
              {formatMessage({
                id: getTranslationKey('import-files'),
                defaultMessage: 'Import files',
              })}
            </MenuItem>
          </SimpleMenu>
        }
      />

      <Layouts.Content>TODO: List/Grid views</Layouts.Content>
    </Layouts.Root>
  );
};
