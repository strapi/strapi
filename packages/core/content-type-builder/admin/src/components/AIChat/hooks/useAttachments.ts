import { useCallback } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';

import { STRAPI_MAX_ATTACHMENT_SIZE, STRAPI_MAX_ATTACHMENTS } from '../lib/constants';
import { generateId } from '../lib/misc';
import { useStrapiChat } from '../providers/ChatProvider';

import { useFetchUploadMedia } from './useAIFetch';

import type { Attachment } from '../lib/types/attachments';

export function useAttachments() {
  const { setAttachments, attachments, id: chatId } = useStrapiChat();
  const { toggleNotification } = useNotification();

  const { fetch: fetchUploadMedia } = useFetchUploadMedia();

  /**
   * Add an attachment directly
   */
  const addAttachments = useCallback(
    (newAttachments: Attachment[]) => {
      // TODO: Limits
      if (!newAttachments) return;
      setAttachments((prev: Attachment[]) => [...prev, ...newAttachments]);
    },
    [setAttachments]
  );

  /**
   * Update an attachment
   */
  const updateAttachment = useCallback(
    (attachment: { id: string } & Partial<Attachment>) => {
      setAttachments((prev: Attachment[]) =>
        prev.map((a) => (a.id === attachment.id ? { ...a, ...attachment } : a))
      );
    },
    [setAttachments]
  );

  /**
   * Remove an attachment
   */
  const removeAttachment = useCallback(
    (attachment: Attachment) => {
      setAttachments((prev: Attachment[]) => prev.filter((a) => a.id !== attachment.id));
    },
    [setAttachments]
  );

  /**
   * Attach files to the chat
   */
  const attachFiles = useCallback(
    async (newFiles: File[], description?: string) => {
      // Attachment number limit
      const attachmentCount = attachments?.length || 0;
      const attachedFileCount = Array.from(newFiles).length;
      let limitedFiles: File[] = newFiles;

      if (attachmentCount + attachedFileCount > STRAPI_MAX_ATTACHMENTS) {
        toggleNotification({
          type: 'danger',
          title: 'File limit reached: ',
          message: `You can only upload up to ${STRAPI_MAX_ATTACHMENTS} files`,
        });

        // Prune the ones that would exceed the limit
        const limit = STRAPI_MAX_ATTACHMENTS - attachmentCount;
        limitedFiles = newFiles.slice(0, limit);
      }

      // Size limit
      for (const file of limitedFiles) {
        if (file.size > STRAPI_MAX_ATTACHMENT_SIZE) {
          toggleNotification({
            type: 'danger',
            title: 'File too large: ',
            message: 'One of the files is too large (15MB limit)',
          });
          // Remove from list
          limitedFiles = limitedFiles.filter((f) => f !== file);
        }
      }

      // Upload
      for (const file of limitedFiles) {
        const pendingAttachment: Attachment = {
          id: generateId(),
          type: 'file',
          status: 'loading',
          filename: file.name,
          mediaType: file.type,
          url: '',
        };

        // Store the attachment as loading
        setAttachments((prev: Attachment[]) => [...prev, pendingAttachment]);

        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileInfo', JSON.stringify({ name: file.name, chatId: chatId }));

        // Upload file
        fetchUploadMedia({ formData })
          .then((result) => {
            const attachment = result?.data;

            // Remove attachment if there is an error
            if (!result || result.error) {
              toggleNotification({
                type: 'danger',
                title: 'Failed to upload file: ',
                message: result?.error || 'Unknown error',
                timeout: 5000,
              });
              removeAttachment(pendingAttachment);
              return;
            }

            // Update the pending attachment
            updateAttachment({
              id: pendingAttachment.id,
              url: attachment?.url || '',
              status: 'ready',
            });
          })
          .catch(() => removeAttachment(pendingAttachment));
      }

      if (description) {
        toggleNotification({
          title: 'Files attached',
          message: description,
        });
      }
    },
    [
      attachments,
      setAttachments,
      toggleNotification,
      chatId,
      fetchUploadMedia,
      removeAttachment,
      updateAttachment,
    ]
  );

  /**
   * Remove an attachment by index
   */
  const removeAttachmentByIndex = useCallback(
    (index: number) => {
      if (!attachments) return;
      setAttachments(attachments.filter((_, i) => i !== index));
    },
    [setAttachments, attachments]
  );

  return { attachments, attachFiles, addAttachments, removeAttachment, removeAttachmentByIndex };
}
