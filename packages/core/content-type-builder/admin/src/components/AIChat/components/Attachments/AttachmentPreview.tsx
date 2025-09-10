import { Loader } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { styled } from 'styled-components';

import { STRAPI_CODE_MIME_TYPE } from '../../lib/constants';
import { Attachment as TAttachment } from '../../lib/types/attachments';
import { Base64Img } from '../Base64Image';
import { FullScreenImage } from '../FullScreenImage';

import { Attachment, AttachmentRootProps } from './components/Attachment';

interface AttachmentPreviewProps {
  attachment: TAttachment;
  loading?: boolean;
  onRemove?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * Image
 * -----------------------------------------------------------------------------------------------*/

const ImageThumbnail = styled(Base64Img)`
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const ImageAttachment = ({
  attachment,
  onRemove,
  ...props
}: AttachmentPreviewProps & Omit<AttachmentRootProps, 'children'>) => {
  return (
    <FullScreenImage.Root src={attachment.url} alt={attachment.filename || 'image'}>
      <FullScreenImage.Trigger asChild>
        <Attachment.Root {...props}>
          <Attachment.Preview>
            {attachment.status === 'loading' ? (
              <Loader small />
            ) : (
              <ImageThumbnail src={attachment.url} alt={attachment.filename} />
            )}
          </Attachment.Preview>
          <Attachment.Title>{attachment.filename || 'unknown'}</Attachment.Title>
          {onRemove && <Attachment.Remove onClick={onRemove} />}
        </Attachment.Root>
      </FullScreenImage.Trigger>
    </FullScreenImage.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Code
 * -----------------------------------------------------------------------------------------------*/

const CodeAttachment = ({
  attachment,
  onRemove,
  ...props
}: AttachmentPreviewProps & Omit<AttachmentRootProps, 'children'>) => {
  return (
    <Attachment.Root {...props}>
      <Attachment.Preview>
        {attachment.status === 'loading' ? <Loader small /> : <Folder height={24} width={24} />}
      </Attachment.Preview>
      <Attachment.Title>{attachment.filename || 'unknown'}</Attachment.Title>
      {onRemove && <Attachment.Remove onClick={onRemove} />}
    </Attachment.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

export const AttachmentPreview = ({
  attachment,
  onRemove,
  ...props
}: AttachmentPreviewProps & Omit<AttachmentRootProps, 'children'>) => {
  if (attachment.mediaType?.startsWith('image/')) {
    return <ImageAttachment attachment={attachment} onRemove={onRemove} {...props} />;
  }

  if (attachment.mediaType === STRAPI_CODE_MIME_TYPE) {
    return <CodeAttachment attachment={attachment} onRemove={onRemove} {...props} />;
  }

  return null;
};
