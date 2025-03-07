import { Loader } from '@strapi/design-system';

import { Attachment } from './components/Attachment';
import { NextLogo } from './components/NextLogo';

interface ProjectThumbnailProps {
  name: string;
  loading?: boolean;
  onRemove?: () => void;
}

export const ProjectAttachment = ({ name, loading, onRemove }: ProjectThumbnailProps) => {
  return (
    <Attachment.Root>
      <Attachment.Preview>{loading ? <Loader small /> : <NextLogo size={16} />}</Attachment.Preview>
      <Attachment.Title>{name}</Attachment.Title>
      {onRemove && <Attachment.Remove onClick={onRemove} />}
    </Attachment.Root>
  );
};
