import type { Struct } from '@strapi/types';

const resolvePreviewImageUrl = (preview?: Struct.PreviewImageValue): string | undefined => {
  if (!preview) {
    return undefined;
  }

  if (typeof preview === 'string') {
    return preview;
  }

  return preview.url;
};

export { resolvePreviewImageUrl };
