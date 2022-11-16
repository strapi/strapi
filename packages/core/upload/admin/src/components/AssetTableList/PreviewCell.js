import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { prefixFileUrlWithBackendUrl, pxToRem } from '@strapi/helper-plugin';
import { Avatar } from '@strapi/design-system/Avatar';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const FileWrapper = styled(Flex)`
  border-radius: 50%;

  span {
    /* The smallest fontSize in the DS is not small enough in this case */
    font-size: ${pxToRem(10)};
  }
`;

export const PreviewCell = ({ alternativeText, fileExtension, mime, name, thumbnailURL, url }) => {
  if (mime.includes('image')) {
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnailURL) ?? prefixFileUrlWithBackendUrl(url);

    return <Avatar src={mediaURL} alt={alternativeText ?? name} preview />;
  }

  return (
    <FileWrapper
      background="secondary100"
      height={pxToRem(26)}
      justifyContent="center"
      width={pxToRem(26)}
    >
      <Typography variant="sigma" textColor="secondary600">
        {fileExtension}
      </Typography>
    </FileWrapper>
  );
};

PreviewCell.defaultProps = {
  alternativeText: null,
  thumbnailURL: null,
};

PreviewCell.propTypes = {
  alternativeText: PropTypes.string,
  fileExtension: PropTypes.string.isRequired,
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  thumbnailURL: PropTypes.string,
  url: PropTypes.string.isRequired,
};
