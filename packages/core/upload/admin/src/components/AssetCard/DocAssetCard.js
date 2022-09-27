import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import FileIcon from '@strapi/icons/File';
import FilePdfIcon from '@strapi/icons/FilePdf';
import { pxToRem } from '@strapi/helper-plugin';

import { AssetCardBase } from './AssetCardBase';

const IconWrapper = styled.span`
  svg {
    font-size: 3rem;
  }
`;

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

export const DocAssetCard = ({ name, extension, size, ...restProps }) => {
  return (
    <AssetCardBase name={name} extension={extension} {...restProps} variant="Doc">
      <CardAsset
        width="100%"
        height={size === 'S' ? pxToRem(88) : pxToRem(164)}
        justifyContent="center"
      >
        <IconWrapper>
          {extension === 'pdf' ? <FilePdfIcon aria-label={name} /> : <FileIcon aria-label={name} />}
        </IconWrapper>
      </CardAsset>
    </AssetCardBase>
  );
};

DocAssetCard.defaultProps = {
  size: 'M',
};

DocAssetCard.propTypes = {
  ...AssetCardBase.propTypes,
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['S', 'M']),
};
