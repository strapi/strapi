import * as React from 'react';

import { Avatar, Flex, Tooltip, Typography, TypographyComponent } from '@strapi/design-system';
import { styled } from 'styled-components';

import { prefixFileUrlWithBackendUrl } from '../../../../utils/urls';

import type { Data } from '@strapi/types';

interface MediaFile {
  id?: Data.ID;
  alternativeText?: string;
  ext: string;
  formats: {
    thumbnail?: {
      url?: string;
    };
  };
  mime: string;
  name: string;
  url: string;
}

/* -------------------------------------------------------------------------------------------------
 * Media
 * -----------------------------------------------------------------------------------------------*/

interface MediaSingleProps extends MediaFile {}

const getFileExtension = (ext: string) => (ext && ext[0] === '.' ? ext.substring(1) : ext);

const MediaSingle = ({ url, mime, alternativeText, name, ext, formats }: MediaSingleProps) => {
  const fileURL = prefixFileUrlWithBackendUrl(url)!;

  if (mime.includes('image')) {
    const thumbnail = formats?.thumbnail?.url;
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnail) || fileURL;

    return (
      <Avatar.Item
        src={mediaURL}
        alt={alternativeText || name}
        fallback={alternativeText || name}
        preview
      />
    );
  }

  const fileExtension = getFileExtension(ext);
  const fileName = name.length > 100 ? `${name.substring(0, 100)}...` : name;

  return (
    <Tooltip description={fileName}>
      <FileWrapper>{fileExtension}</FileWrapper>
    </Tooltip>
  );
};

const FileWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      tag="span"
      position="relative"
      borderRadius="50%"
      width="26px"
      height="26px"
      borderColor="neutral200"
      background="neutral150"
      paddingLeft="1px"
      justifyContent="center"
      alignItems="center"
    >
      <FileTypography variant="sigma" textColor="neutral600">
        {children}
      </FileTypography>
    </Flex>
  );
};

const FileTypography = styled<TypographyComponent>(Typography)`
  font-size: 0.9rem;
  line-height: 0.9rem;
`;

/* -------------------------------------------------------------------------------------------------
 * MediaMultiple
 * -----------------------------------------------------------------------------------------------*/

interface MediaMultipleProps {
  content: MediaFile[];
}

const MediaMultiple = ({ content }: MediaMultipleProps) => {
  return (
    <Avatar.Group>
      {content.map((file, index) => {
        const key = `${file.id}${index}`;

        if (index === 3) {
          const remainingFiles = `+${content.length - 3}`;

          return <FileWrapper key={key}>{remainingFiles}</FileWrapper>;
        }

        if (index > 3) {
          return null;
        }

        return <MediaSingle key={key} {...file} />;
      })}
    </Avatar.Group>
  );
};

export { MediaMultiple, MediaSingle };
export type { MediaMultipleProps, MediaSingleProps };
