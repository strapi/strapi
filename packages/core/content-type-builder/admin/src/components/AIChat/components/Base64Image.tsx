import { useState, useEffect, ImgHTMLAttributes } from 'react';

import { Flex, Loader } from '@strapi/design-system';
import { CrossCircle } from '@strapi/icons';

const blobToBase64 = (blob: Blob): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Check if a string is already a data URL (base64 image)
const isBase64Image = (src: string): boolean => {
  return src.startsWith('data:image/');
};

interface Base64ImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  inferSize?: boolean;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const Base64Img: React.FC<Base64ImgProps> = ({
  src,
  alt,
  inferSize = false,
  onLoad: externalOnLoad,
  onError: externalOnError,
  ...rest
}) => {
  const [base64Src, setBase64Src] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchAndConvert = async () => {
      setIsLoading(true);
      setHasError(false);

      // If src is already a base64 string, use it directly
      if (isBase64Image(src)) {
        setBase64Src(src);
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Find a better way of doing this
        // If url is from strapi-ai-staging.s3.us-east-1.amazonaws.com or strapi-ai-production.s3.us-east-1.amazonaws.com, use it directly
        const url = new URL(src);
        const allowedDomains = [
          'strapi-ai-staging.s3.us-east-1.amazonaws.com',
          'strapi-ai-production.s3.us-east-1.amazonaws.com',
        ];

        if (allowedDomains.includes(url.hostname)) {
          setBase64Src(src);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // If URL parsing fails, continue with the fetch attempt
      }

      try {
        // Only fetch if it's a URL and not already a base64 string
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const dataUrl = await blobToBase64(blob);
        setBase64Src(dataUrl as string);
        setIsLoading(false);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchAndConvert();
  }, [src, externalOnError]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (inferSize) {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setDimensions({ width: naturalWidth, height: naturalHeight });
    }

    if (externalOnLoad) {
      externalOnLoad(e);
    }
  };

  if (isLoading) {
    return (
      <Flex direction="column" gap={2} alignItems="center" width="100%">
        <Loader small />
      </Flex>
    );
  }

  if (hasError) {
    return (
      <Flex direction="column" gap={2} alignItems="center" width="100%">
        <CrossCircle width={24} height={24} fill="danger600" />
      </Flex>
    );
  }

  // Build props for the img element
  const imgProps: ImgHTMLAttributes<HTMLImageElement> = {
    src: base64Src || '',
    alt,
    onLoad: handleImageLoad,
    ...rest,
  };

  // If inferSize is enabled and width/height weren't explicitly provided,
  // merge the inferred dimensions into the props once available.
  if (inferSize && !rest.width && !rest.height && dimensions.width && dimensions.height) {
    imgProps.width = dimensions.width;
    imgProps.height = dimensions.height;
  }

  return base64Src ? <img {...imgProps} /> : null;
};
