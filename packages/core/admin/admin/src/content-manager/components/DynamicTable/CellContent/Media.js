import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Avatar } from '@strapi/parts/Avatar';
import { TableLabel } from '@strapi/parts/Text';
import { Row } from '@strapi/parts/Row';

import { getFileExtension, prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

// TODO: this is very temporary until we get a design
const FileWrapper = styled(Row)`
  position: relative;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral150};

  span {
    line-height: 0;
  }
`;

const Media = ({ url, mime, alternativeText, name, ext, formats }) => {
  const fileURL = prefixFileUrlWithBackendUrl(url);

  if (mime.includes('image')) {
    const thumbnail = formats?.thumbnail?.url || null;
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnail) || fileURL;

    return <Avatar src={mediaURL} alt={alternativeText || name} preview />;
  }

  const fileExtension = getFileExtension(ext);

  return (
    <FileWrapper justifyContent="center" alignItems="center">
      <TableLabel textColor="neutral600">{fileExtension}</TableLabel>
    </FileWrapper>
  );
};

Media.defaultProps = {
  alternativeText: null,
  formats: null,
};

Media.propTypes = {
  alternativeText: PropTypes.string,
  ext: PropTypes.string.isRequired,
  formats: PropTypes.object,
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

export default Media;
