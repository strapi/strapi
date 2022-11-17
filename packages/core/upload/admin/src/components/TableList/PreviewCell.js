import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { prefixFileUrlWithBackendUrl, pxToRem } from '@strapi/helper-plugin';
import { Avatar } from '@strapi/design-system/Avatar';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import Folder from '@strapi/icons/Folder';

const GenericAssetWrapper = styled(Flex)`
  span {
    /* The smallest fontSize in the DS is not small enough in this case */
    font-size: ${pxToRem(10)};
  }
`;

export const PreviewCell = ({ alternativeText, fileExtension, mime, thumbnailURL, type, url }) => {
  if (type === 'folder') {
    return (
      <Flex
        background="secondary100"
        height={pxToRem(26)}
        justifyContent="center"
        width={pxToRem(26)}
        borderRadius="50%"
      >
        <Icon color="secondary500" as={Folder} />
      </Flex>
    );
  }

  if (mime.includes('image')) {
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnailURL) ?? prefixFileUrlWithBackendUrl(url);

    return <Avatar src={mediaURL} alt={alternativeText} preview />;
  }

  return (
    <GenericAssetWrapper
      background="secondary100"
      height={pxToRem(26)}
      justifyContent="center"
      width={pxToRem(26)}
      borderRadius="50%"
    >
      <Typography variant="sigma" textColor="secondary600">
        {fileExtension}
      </Typography>
    </GenericAssetWrapper>
  );
};

PreviewCell.defaultProps = {
  alternativeText: null,
  fileExtension: '',
  mime: null,
  thumbnailURL: null,
  url: null,
};

PreviewCell.propTypes = {
  alternativeText: PropTypes.string,
  fileExtension: PropTypes.string,
  mime: PropTypes.string,
  thumbnailURL: PropTypes.string,
  type: PropTypes.string.isRequired,
  url: PropTypes.string,
};
